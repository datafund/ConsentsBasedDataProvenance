import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { HttpNetworkUserConfig } from "hardhat/types";
import {
  MAINNET_NETWORKS,
  TESTNET_NETWORKS,
  assertMainnetSigningSafe,
  buildNetworks,
  findPlaintextMainnetSecrets,
  getMainnetSafeAddress,
  mainnetLedgerAccounts,
} from "../config/networks";
import { deployWithSafeHandoff, handOffAdmin } from "../scripts/lib/mainnet-deploy";
import ConsentSystemV3 from "../ignition/modules/ConsentSystemV3";

// Key-shaped dummy value (32 bytes of 0xab); not a real key.
const TEST_KEY = "0x" + "ab".repeat(32);
const LEDGER_ADDR = "0x1111111111111111111111111111111111111111";

describe("Mainnet deployment", function () {
  describe("network config guard", function () {
    it("gives the testnet key to testnets only, never to mainnet networks", function () {
      const nets = buildNetworks({ TESTNET_DEPLOYER_PRIVATE_KEY: TEST_KEY });
      for (const name of Object.keys(TESTNET_NETWORKS)) {
        expect((nets[name] as HttpNetworkUserConfig).accounts).to.deep.equal([TEST_KEY]);
      }
      for (const name of Object.keys(MAINNET_NETWORKS)) {
        const net = nets[name] as HttpNetworkUserConfig & { ledgerAccounts: string[] };
        expect(net.accounts, name).to.deep.equal([]);
        expect(net.ledgerAccounts, name).to.deep.equal([]);
        expect(JSON.stringify(net), name).to.not.include(TEST_KEY.slice(2));
      }
    });

    it("signs mainnet networks with the Ledger address from MAINNET_DEPLOYER_ADDRESS", function () {
      const nets = buildNetworks({
        TESTNET_DEPLOYER_PRIVATE_KEY: TEST_KEY,
        MAINNET_DEPLOYER_ADDRESS: LEDGER_ADDR,
      });
      for (const name of Object.keys(MAINNET_NETWORKS)) {
        const net = nets[name] as HttpNetworkUserConfig & { ledgerAccounts: string[] };
        expect(net.ledgerAccounts).to.deep.equal([LEDGER_ADDR]);
        expect(net.accounts).to.deep.equal([]);
      }
      // Testnets do not get the Ledger account.
      expect((nets.sepolia as any).ledgerAccounts).to.equal(undefined);
    });

    it("rejects a private key pasted into MAINNET_DEPLOYER_ADDRESS", function () {
      expect(() => mainnetLedgerAccounts({ MAINNET_DEPLOYER_ADDRESS: TEST_KEY })).to.throw(/looks like a private key/);
      expect(() => mainnetLedgerAccounts({ MAINNET_DEPLOYER_ADDRESS: TEST_KEY.slice(2) })).to.throw(/looks like a private key/);
      expect(() => mainnetLedgerAccounts({ MAINNET_DEPLOYER_ADDRESS: "0x1234" })).to.throw(/not a valid address/);
    });

    it("refuses a mainnet network when a plaintext mainnet key is in the environment", function () {
      const cfg = { chainId: 1, accounts: [] as string[] };
      for (const name of ["MAINNET_DEPLOYER_PRIVATE_KEY", "PRIVATE_KEY", "DEPLOYER_PRIVATE_KEY", "MNEMONIC"]) {
        expect(() => assertMainnetSigningSafe("mainnet", cfg, { [name]: TEST_KEY }), name).to.throw(
          new RegExp(`plaintext signing secrets.*${name}`)
        );
      }
      for (const name of Object.keys(MAINNET_NETWORKS)) {
        expect(() =>
          assertMainnetSigningSafe(name, { chainId: MAINNET_NETWORKS[name].chainId, accounts: [] }, {
            MAINNET_DEPLOYER_PRIVATE_KEY: TEST_KEY,
          })
        ).to.throw(/plaintext signing secrets/);
      }
    });

    it("refuses a mainnet network configured with local accounts, even under another name", function () {
      expect(() =>
        assertMainnetSigningSafe("base", { chainId: 8453, accounts: [TEST_KEY] }, {})
      ).to.throw(/configured with local accounts/);
      // A custom network that points at a mainnet chain ID is still mainnet.
      expect(() =>
        assertMainnetSigningSafe("myBase", { chainId: 8453, accounts: [TEST_KEY] }, {})
      ).to.throw(/configured with local accounts/);
      expect(() =>
        assertMainnetSigningSafe(
          "gnosis",
          { chainId: 100, accounts: { mnemonic: "test test test", initialIndex: 0, count: 1, path: "m/44'/60'/0'/0", passphrase: "" } as any },
          {}
        )
      ).to.throw(/configured with local accounts/);
    });

    it("allows mainnet with only the testnet key present, and allows testnets with a plaintext key", function () {
      expect(() =>
        assertMainnetSigningSafe("mainnet", { chainId: 1, accounts: [] }, { TESTNET_DEPLOYER_PRIVATE_KEY: TEST_KEY })
      ).to.not.throw();
      expect(() =>
        assertMainnetSigningSafe("sepolia", { chainId: 11155111, accounts: [TEST_KEY] }, { PRIVATE_KEY: TEST_KEY })
      ).to.not.throw();
      expect(findPlaintextMainnetSecrets({ TESTNET_DEPLOYER_PRIVATE_KEY: TEST_KEY, MAINNET_DEPLOYER_PRIVATE_KEY: "" })).to.deep.equal([]);
    });

    it("the live Hardhat config gives mainnet networks no local accounts", function () {
      for (const name of Object.keys(MAINNET_NETWORKS)) {
        const net = hre.config.networks[name] as any;
        expect(net, name).to.not.equal(undefined);
        expect(net.chainId).to.equal(MAINNET_NETWORKS[name].chainId);
        expect(net.accounts, name).to.deep.equal([]);
        expect(net.ledgerAccounts, name).to.be.an("array");
      }
    });

    it("requires a valid MAINNET_SAFE_ADDRESS", function () {
      expect(() => getMainnetSafeAddress({})).to.throw(/MAINNET_SAFE_ADDRESS is not set/);
      expect(() => getMainnetSafeAddress({ MAINNET_SAFE_ADDRESS: "0xabc" })).to.throw(/not a valid address/);
      expect(getMainnetSafeAddress({ MAINNET_SAFE_ADDRESS: LEDGER_ADDR })).to.equal(LEDGER_ADDR);
    });
  });

  describe("deploy and hand admin rights to the Safe (local Hardhat network)", function () {
    async function deploySafe(threshold: number) {
      const signers = await ethers.getSigners();
      const owners = [signers[5].address, signers[6].address, signers[7].address];
      const safe = await ethers.deployContract("MockSafe", [owners, threshold]);
      await safe.waitForDeployment();
      return safe.getAddress();
    }

    const quiet = () => {};

    it("deploys, hands every admin right to the Safe, and leaves the deployer with none", async function () {
      const [deployer, outsider] = await ethers.getSigners();
      const safe = await deploySafe(2);

      const result = await deployWithSafeHandoff(hre, {
        ignitionModule: ConsentSystemV3,
        env: { MAINNET_SAFE_ADDRESS: safe },
        requireMainnet: false,
        log: quiet,
      });
      expect(result.safe).to.equal(safe);
      expect(result.deployer).to.equal(deployer.address);

      const dp = await ethers.getContractAt("DataProvenance", result.contracts.dataProvenance);
      const pr = await ethers.getContractAt("PurposeRegistry", result.contracts.purposeRegistry);
      const al = await ethers.getContractAt("ConsentAuditLog", result.contracts.consentAuditLog);
      const ADMIN_ROLE = await dp.ADMIN_ROLE();

      expect(await dp.hasRole(ADMIN_ROLE, safe)).to.be.true;
      expect(await dp.hasRole(ADMIN_ROLE, deployer.address)).to.be.false;
      expect(await dp.getRoleMemberCount(ADMIN_ROLE)).to.equal(1n);
      expect(await pr.admin()).to.equal(safe);
      expect(await al.admin()).to.equal(safe);

      // The deployer can no longer use any admin function.
      const OPERATOR_ROLE = await dp.OPERATOR_ROLE();
      await expect((dp.connect(deployer) as typeof dp).grantRole(OPERATOR_ROLE, outsider.address)).to.be.revertedWith(
        "AccessControl: admin role required"
      );
      await expect((pr.connect(deployer) as typeof pr).transferAdmin(deployer.address)).to.be.revertedWith("Not admin");
      await expect((al.connect(deployer) as typeof al).setAuthorizedRecorder(outsider.address, true)).to.be.revertedWith("Not admin");

      // Re-running the hand-off is a no-op, so an interrupted run can resume.
      await handOffAdmin(hre, result.contracts, safe, deployer, quiet);
      expect(await dp.getRoleMemberCount(ADMIN_ROLE)).to.equal(1n);
    });

    it("refuses before sending any transaction when no Safe is configured", async function () {
      const [deployer] = await ethers.getSigners();
      const nonceBefore = await ethers.provider.getTransactionCount(deployer.address);
      await expect(
        deployWithSafeHandoff(hre, { ignitionModule: ConsentSystemV3, env: {}, requireMainnet: false, log: quiet })
      ).to.be.rejectedWith(/MAINNET_SAFE_ADDRESS is not set/);
      expect(await ethers.provider.getTransactionCount(deployer.address)).to.equal(nonceBefore);
    });

    it("refuses a Safe address with no contract, or a 1-of-N Safe", async function () {
      const [deployer, , eoa] = await ethers.getSigners();
      await expect(
        deployWithSafeHandoff(hre, {
          ignitionModule: ConsentSystemV3,
          env: { MAINNET_SAFE_ADDRESS: eoa.address },
          requireMainnet: false,
          log: quiet,
        })
      ).to.be.rejectedWith(/has no contract code/);

      const weakSafe = await deploySafe(1);
      const nonceBefore = await ethers.provider.getTransactionCount(deployer.address);
      await expect(
        deployWithSafeHandoff(hre, {
          ignitionModule: ConsentSystemV3,
          env: { MAINNET_SAFE_ADDRESS: weakSafe },
          requireMainnet: false,
          log: quiet,
        })
      ).to.be.rejectedWith(/threshold 1/);
      expect(await ethers.provider.getTransactionCount(deployer.address)).to.equal(nonceBefore);
    });

    it("the mainnet entry point refuses to run against a non-mainnet network", async function () {
      const safe = await deploySafe(2);
      await expect(
        deployWithSafeHandoff(hre, {
          ignitionModule: ConsentSystemV3,
          env: { MAINNET_SAFE_ADDRESS: safe },
          requireMainnet: true,
          log: quiet,
        })
      ).to.be.rejectedWith(/is not a mainnet network/);
    });
  });

  describe("ConsentAuditLog.transferAdmin", function () {
    it("lets only the admin transfer, rejects the zero address, and emits AdminTransferred", async function () {
      const [admin, next, other] = await ethers.getSigners();
      const log = await ethers.deployContract("ConsentAuditLog");
      await expect((log.connect(other) as typeof log).transferAdmin(other.address)).to.be.revertedWith("Not admin");
      await expect(log.transferAdmin(ethers.ZeroAddress)).to.be.revertedWith("Invalid admin");
      await expect(log.transferAdmin(next.address))
        .to.emit(log, "AdminTransferred")
        .withArgs(admin.address, next.address);
      expect(await log.admin()).to.equal(next.address);
      await expect((log.connect(admin) as typeof log).setAuthorizedRecorder(other.address, true)).to.be.revertedWith("Not admin");
    });
  });
});
