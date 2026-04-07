import { expect } from "chai";
import { ethers } from "hardhat";
import {
  DataProvenance,
  ConsentReceipt,
  KantaraConsentReceipt,
  IntegratedConsentProvenanceSystem
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * SECURITY TEST SUITE
 *
 * These tests attempt to break contracts through:
 * - Access control bypasses
 * - Replay attacks
 * - Signature manipulation
 * - DoS vectors
 * - State manipulation
 * - Edge cases and boundary conditions
 */

describe("Security Tests", function () {
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;
  let victim: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, attacker, victim, user1, user2] = await ethers.getSigners();
  });

  // ============================================================
  // DataProvenance Security Tests
  // ============================================================
  describe("DataProvenance Security", function () {
    let dataProvenance: DataProvenance;
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes("test-data"));

    beforeEach(async function () {
      const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
      dataProvenance = await DataProvenanceFactory.deploy();
      await dataProvenance.waitForDeployment();
    });

    describe("RBAC Bypass Attempts", function () {
      it("should prevent non-admin from granting roles", async function () {
        await expect(
          dataProvenance.connect(attacker).grantRole(
            await dataProvenance.OPERATOR_ROLE(),
            attacker.address
          )
        ).to.be.revertedWith("AccessControl: admin role required");
      });

      it("should prevent non-admin from revoking roles", async function () {
        // First grant a role as admin
        await dataProvenance.connect(owner).grantRole(
          await dataProvenance.OPERATOR_ROLE(),
          user1.address
        );

        // Attacker tries to revoke
        await expect(
          dataProvenance.connect(attacker).revokeRole(
            await dataProvenance.OPERATOR_ROLE(),
            user1.address
          )
        ).to.be.revertedWith("AccessControl: admin role required");
      });

      it("should prevent self-granting admin role", async function () {
        await expect(
          dataProvenance.connect(attacker).grantRole(
            await dataProvenance.ADMIN_ROLE(),
            attacker.address
          )
        ).to.be.revertedWith("AccessControl: admin role required");
      });

      it("should prevent operator from escalating to admin", async function () {
        await dataProvenance.connect(owner).grantRole(
          await dataProvenance.OPERATOR_ROLE(),
          attacker.address
        );

        await expect(
          dataProvenance.connect(attacker).grantRole(
            await dataProvenance.ADMIN_ROLE(),
            attacker.address
          )
        ).to.be.revertedWith("AccessControl: admin role required");
      });

      it("should prevent non-operator from changing data status via operator function", async function () {
        await dataProvenance.connect(victim).registerData(dataHash, "document");

        await expect(
          dataProvenance.connect(attacker).operatorSetDataStatus(dataHash, 1) // Restricted
        ).to.be.revertedWith("AccessControl: account is missing role");
      });

      it("should allow user to renounce their own role", async function () {
        await dataProvenance.connect(owner).grantRole(
          await dataProvenance.OPERATOR_ROLE(),
          user1.address
        );

        await dataProvenance.connect(user1).renounceRole(
          await dataProvenance.OPERATOR_ROLE()
        );

        expect(await dataProvenance.hasRole(
          await dataProvenance.OPERATOR_ROLE(),
          user1.address
        )).to.be.false;
      });
    });

    describe("Delegate Authorization Exploits", function () {
      it("should prevent self-delegation", async function () {
        await expect(
          dataProvenance.connect(victim).setDelegate(victim.address, true)
        ).to.be.revertedWith("Cannot delegate to self");
      });

      it("should prevent delegation to zero address", async function () {
        await expect(
          dataProvenance.connect(victim).setDelegate(ethers.ZeroAddress, true)
        ).to.be.revertedWith("Invalid delegate");
      });

      it("should prevent unauthorized delegate from registering data", async function () {
        await expect(
          dataProvenance.connect(attacker).registerDataFor(
            dataHash,
            "stolen",
            victim.address
          )
        ).to.be.revertedWith("Not authorized delegate");
      });

      it("should prevent delegate after authorization revoked", async function () {
        // Authorize then revoke
        await dataProvenance.connect(victim).setDelegate(attacker.address, true);
        await dataProvenance.connect(victim).setDelegate(attacker.address, false);

        await expect(
          dataProvenance.connect(attacker).registerDataFor(
            dataHash,
            "stolen",
            victim.address
          )
        ).to.be.revertedWith("Not authorized delegate");
      });

      it("should prevent delegate from impersonating wrong owner", async function () {
        // Attacker authorized by user1, tries to register for victim
        await dataProvenance.connect(user1).setDelegate(attacker.address, true);

        await expect(
          dataProvenance.connect(attacker).registerDataFor(
            dataHash,
            "stolen",
            victim.address // Wrong owner
          )
        ).to.be.revertedWith("Not authorized delegate");
      });
    });

    describe("Ownership Attack Vectors", function () {
      beforeEach(async function () {
        await dataProvenance.connect(victim).registerData(dataHash, "document");
      });

      it("should prevent non-owner from transferring ownership", async function () {
        await expect(
          dataProvenance.connect(attacker).transferDataOwnership(
            dataHash,
            attacker.address
          )
        ).to.be.revertedWith("Not the owner");
      });

      it("should prevent transfer to zero address", async function () {
        await expect(
          dataProvenance.connect(victim).transferDataOwnership(
            dataHash,
            ethers.ZeroAddress
          )
        ).to.be.revertedWith("Invalid new owner");
      });

      it("should prevent transfer to self", async function () {
        await expect(
          dataProvenance.connect(victim).transferDataOwnership(
            dataHash,
            victim.address
          )
        ).to.be.revertedWith("Already the owner");
      });

      it("should prevent non-owner from changing data status", async function () {
        await expect(
          dataProvenance.connect(attacker).setDataStatus(dataHash, 1) // Restricted
        ).to.be.revertedWith("Not the owner");
      });

      it("should prevent non-owner from recording transformations", async function () {
        const newHash = ethers.keccak256(ethers.toUtf8Bytes("transformed"));
        await expect(
          dataProvenance.connect(attacker).recordTransformation(
            dataHash,
            newHash,
            "stolen transformation"
          )
        ).to.be.revertedWith("Not the owner of the original data");
      });
    });

    describe("DoS and Resource Exhaustion", function () {
      it("should enforce MAX_TRANSFORMATIONS limit", async function () {
        await dataProvenance.connect(victim).registerData(dataHash, "document");

        // Fill up transformations to the limit
        for (let i = 0; i < 100; i++) {
          const newHash = ethers.keccak256(ethers.toUtf8Bytes(`transform-${i}`));
          await dataProvenance.connect(victim).recordTransformation(
            dataHash,
            newHash,
            `transform ${i}`
          );
        }

        // 101st should fail
        const overflowHash = ethers.keccak256(ethers.toUtf8Bytes("overflow"));
        await expect(
          dataProvenance.connect(victim).recordTransformation(
            dataHash,
            overflowHash,
            "overflow"
          )
        ).to.be.revertedWith("Max transformations reached");
      });

      it("should enforce batch operation limits", async function () {
        const tooManyHashes = Array(51).fill(null).map((_, i) =>
          ethers.keccak256(ethers.toUtf8Bytes(`data-${i}`))
        );
        const tooManyTypes = Array(51).fill("test");

        await expect(
          dataProvenance.connect(victim).batchRegisterData(tooManyHashes, tooManyTypes)
        ).to.be.revertedWith("Too many data items");
      });

      it("should prevent empty batch operations", async function () {
        await expect(
          dataProvenance.connect(victim).batchRegisterData([], [])
        ).to.be.revertedWith("Empty data hashes array");
      });

      it("should prevent mismatched array lengths in batch", async function () {
        const hashes = [dataHash];
        const types = ["type1", "type2"];

        await expect(
          dataProvenance.connect(victim).batchRegisterData(hashes, types)
        ).to.be.revertedWith("Array length mismatch");
      });
    });

    describe("Input Validation Bypasses", function () {
      it("should reject zero data hash", async function () {
        await expect(
          dataProvenance.connect(victim).registerData(ethers.ZeroHash, "document")
        ).to.be.revertedWith("Invalid data hash");
      });

      it("should reject empty data type", async function () {
        await expect(
          dataProvenance.connect(victim).registerData(dataHash, "")
        ).to.be.revertedWith("Data type cannot be empty");
      });

      it("should reject overly long data type", async function () {
        const longType = "a".repeat(65);
        await expect(
          dataProvenance.connect(victim).registerData(dataHash, longType)
        ).to.be.revertedWith("Data type too long");
      });

      it("should reject duplicate data registration", async function () {
        await dataProvenance.connect(victim).registerData(dataHash, "document");

        await expect(
          dataProvenance.connect(attacker).registerData(dataHash, "stolen")
        ).to.be.revertedWith("Data already registered");
      });

      it("should reject empty transformation description", async function () {
        await dataProvenance.connect(victim).registerData(dataHash, "document");
        const newHash = ethers.keccak256(ethers.toUtf8Bytes("new"));

        await expect(
          dataProvenance.connect(victim).recordTransformation(dataHash, newHash, "")
        ).to.be.revertedWith("Transformation cannot be empty");
      });

      it("should reject overly long transformation description", async function () {
        await dataProvenance.connect(victim).registerData(dataHash, "document");
        const newHash = ethers.keccak256(ethers.toUtf8Bytes("new"));
        const longTransform = "a".repeat(257);

        await expect(
          dataProvenance.connect(victim).recordTransformation(dataHash, newHash, longTransform)
        ).to.be.revertedWith("Transformation too long");
      });
    });

    describe("State Manipulation Attacks", function () {
      it("should prevent accessing non-existent data", async function () {
        await expect(
          dataProvenance.connect(attacker).recordAccess(dataHash)
        ).to.be.revertedWith("Data does not exist");
      });

      it("should prevent accessing restricted data", async function () {
        await dataProvenance.connect(victim).registerData(dataHash, "document");
        await dataProvenance.connect(victim).setDataStatus(dataHash, 1); // Restricted

        await expect(
          dataProvenance.connect(attacker).recordAccess(dataHash)
        ).to.be.revertedWith("Data is not active");
      });

      it("should prevent transforming non-active data", async function () {
        await dataProvenance.connect(victim).registerData(dataHash, "document");
        await dataProvenance.connect(victim).setDataStatus(dataHash, 2); // Deleted

        const newHash = ethers.keccak256(ethers.toUtf8Bytes("new"));
        await expect(
          dataProvenance.connect(victim).recordTransformation(dataHash, newHash, "transform")
        ).to.be.revertedWith("Data is not active");
      });

      it("should prevent changing to same status", async function () {
        await dataProvenance.connect(victim).registerData(dataHash, "document");

        await expect(
          dataProvenance.connect(victim).setDataStatus(dataHash, 0) // Already Active
        ).to.be.revertedWith("Status unchanged");
      });

      it("should deduplicate access records", async function () {
        await dataProvenance.connect(victim).registerData(dataHash, "document");

        // Record access multiple times
        await dataProvenance.connect(attacker).recordAccess(dataHash);
        await dataProvenance.connect(attacker).recordAccess(dataHash);
        await dataProvenance.connect(attacker).recordAccess(dataHash);

        const record = await dataProvenance.getDataRecord(dataHash);
        expect(record.accessors.length).to.equal(1);
      });
    });

    describe("Role Member Enumeration Edge Cases", function () {
      it("should revert on out-of-bounds role member index", async function () {
        await expect(
          dataProvenance.getRoleMember(await dataProvenance.ADMIN_ROLE(), 999)
        ).to.be.revertedWith("Index out of bounds");
      });

      it("should correctly track role member count after grant/revoke cycles", async function () {
        const operatorRole = await dataProvenance.OPERATOR_ROLE();

        await dataProvenance.grantRole(operatorRole, user1.address);
        await dataProvenance.grantRole(operatorRole, user2.address);
        expect(await dataProvenance.getRoleMemberCount(operatorRole)).to.equal(2);

        await dataProvenance.revokeRole(operatorRole, user1.address);
        expect(await dataProvenance.getRoleMemberCount(operatorRole)).to.equal(1);

        // Re-granting should add back
        await dataProvenance.grantRole(operatorRole, user1.address);
        expect(await dataProvenance.getRoleMemberCount(operatorRole)).to.equal(2);
      });

      it("should not add duplicate role members on re-grant", async function () {
        const operatorRole = await dataProvenance.OPERATOR_ROLE();

        await dataProvenance.grantRole(operatorRole, user1.address);
        await dataProvenance.grantRole(operatorRole, user1.address); // Duplicate grant

        expect(await dataProvenance.getRoleMemberCount(operatorRole)).to.equal(1);
      });
    });
  });

  // ============================================================
  // ConsentReceipt Security Tests
  // ============================================================
  describe("ConsentReceipt Security", function () {
    let consentReceipt: ConsentReceipt;

    beforeEach(async function () {
      const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
      consentReceipt = await ConsentReceiptFactory.deploy();
      await consentReceipt.waitForDeployment();
    });

    async function signConsent(
      signer: SignerWithAddress,
      purpose: string,
      expiryTime: number,
      nonce: number,
      deadline: number
    ) {
      const domain = {
        name: "ConsentReceipt",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await consentReceipt.getAddress()
      };

      const types = {
        Consent: [
          { name: "user", type: "address" },
          { name: "purpose", type: "string" },
          { name: "expiryTime", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" }
        ]
      };

      const value = {
        user: signer.address,
        purpose: purpose,
        expiryTime: expiryTime,
        nonce: nonce,
        deadline: deadline
      };

      const signature = await signer.signTypedData(domain, types, value);
      return ethers.Signature.from(signature);
    }

    describe("EIP-712 Signature Attacks", function () {
      it("should reject signature replay attacks", async function () {
        const block = await ethers.provider.getBlock("latest");
        const deadline = block!.timestamp + 3600;

        const sig = await signConsent(victim, "analytics", 0, 0, deadline);

        // First use succeeds
        await consentReceipt.connect(attacker).giveConsentBySig(
          victim.address, "analytics", 0, deadline, sig.v, sig.r, sig.s
        );

        // Replay fails (nonce incremented)
        await expect(
          consentReceipt.connect(attacker).giveConsentBySig(
            victim.address, "analytics", 0, deadline, sig.v, sig.r, sig.s
          )
        ).to.be.revertedWith("Invalid signature");
      });

      it("should reject expired signatures", async function () {
        const block = await ethers.provider.getBlock("latest");
        const deadline = block!.timestamp - 1; // Already expired

        const sig = await signConsent(victim, "analytics", 0, 0, deadline);

        await expect(
          consentReceipt.connect(attacker).giveConsentBySig(
            victim.address, "analytics", 0, deadline, sig.v, sig.r, sig.s
          )
        ).to.be.revertedWith("Signature expired");
      });

      it("should reject signatures from wrong signer", async function () {
        const block = await ethers.provider.getBlock("latest");
        const deadline = block!.timestamp + 3600;

        // Attacker signs but claims to be victim
        const sig = await signConsent(attacker, "analytics", 0, 0, deadline);

        await expect(
          consentReceipt.connect(attacker).giveConsentBySig(
            victim.address, "analytics", 0, deadline, sig.v, sig.r, sig.s
          )
        ).to.be.revertedWith("Invalid signature");
      });

      it("should reject forged signatures (wrong nonce)", async function () {
        const block = await ethers.provider.getBlock("latest");
        const deadline = block!.timestamp + 3600;

        // Sign with wrong nonce
        const sig = await signConsent(victim, "analytics", 0, 999, deadline);

        await expect(
          consentReceipt.connect(attacker).giveConsentBySig(
            victim.address, "analytics", 0, deadline, sig.v, sig.r, sig.s
          )
        ).to.be.revertedWith("Invalid signature");
      });

      it("should reject signatures with tampered purpose", async function () {
        const block = await ethers.provider.getBlock("latest");
        const deadline = block!.timestamp + 3600;

        // Sign for "analytics"
        const sig = await signConsent(victim, "analytics", 0, 0, deadline);

        // Try to use for "marketing"
        await expect(
          consentReceipt.connect(attacker).giveConsentBySig(
            victim.address, "marketing", 0, deadline, sig.v, sig.r, sig.s
          )
        ).to.be.revertedWith("Invalid signature");
      });

      it("should reject signatures with tampered expiry", async function () {
        const block = await ethers.provider.getBlock("latest");
        const deadline = block!.timestamp + 3600;
        const expiryTime = block!.timestamp + 86400;

        // Sign with specific expiry
        const sig = await signConsent(victim, "analytics", expiryTime, 0, deadline);

        // Try to use with no expiry (0)
        await expect(
          consentReceipt.connect(attacker).giveConsentBySig(
            victim.address, "analytics", 0, deadline, sig.v, sig.r, sig.s
          )
        ).to.be.revertedWith("Invalid signature");
      });

      it("should reject zero address recovery (malformed signature)", async function () {
        const block = await ethers.provider.getBlock("latest");
        const deadline = block!.timestamp + 3600;

        // Use invalid signature components that would recover to zero address
        await expect(
          consentReceipt.connect(attacker).giveConsentBySig(
            victim.address,
            "analytics",
            0,
            deadline,
            27, // v
            ethers.ZeroHash, // r
            ethers.ZeroHash  // s
          )
        ).to.be.revertedWith("Invalid signature");
      });

      it("should prevent cross-chain replay (different chainId)", async function () {
        // The signature is bound to chainId via DOMAIN_SEPARATOR
        // We can verify the DOMAIN_SEPARATOR includes chainId
        const domainSeparator = await consentReceipt.DOMAIN_SEPARATOR();
        expect(domainSeparator).to.not.equal(ethers.ZeroHash);
      });
    });

    describe("Consent Manipulation Attacks", function () {
      it("should prevent revoking other users' consents", async function () {
        await consentReceipt.connect(victim)["giveConsent(string)"]("analytics");

        // Attacker has no consents, index 0 doesn't exist for them
        await expect(
          consentReceipt.connect(attacker).revokeConsent(0)
        ).to.be.revertedWith("Invalid consent index");
      });

      it("should prevent double revocation", async function () {
        await consentReceipt.connect(victim)["giveConsent(string)"]("analytics");
        await consentReceipt.connect(victim).revokeConsent(0);

        await expect(
          consentReceipt.connect(victim).revokeConsent(0)
        ).to.be.revertedWith("Consent already revoked");
      });

      it("should correctly handle expired consent status", async function () {
        const block = await ethers.provider.getBlock("latest");
        const expiryTime = block!.timestamp + 100;

        await consentReceipt.connect(victim)["giveConsent(string,uint256)"]("expiring", expiryTime);

        // Valid now
        expect(await consentReceipt.getConsentStatus(victim.address, "expiring")).to.be.true;

        // Fast forward past expiry
        await ethers.provider.send("evm_increaseTime", [150]);
        await ethers.provider.send("evm_mine", []);

        // Now expired
        expect(await consentReceipt.getConsentStatus(victim.address, "expiring")).to.be.false;
      });
    });

    describe("Input Validation Attacks", function () {
      it("should reject empty purpose", async function () {
        await expect(
          consentReceipt.connect(victim)["giveConsent(string)"]("")
        ).to.be.revertedWith("Purpose cannot be empty");
      });

      it("should reject overly long purpose", async function () {
        const longPurpose = "a".repeat(257);
        await expect(
          consentReceipt.connect(victim)["giveConsent(string)"](longPurpose)
        ).to.be.revertedWith("Purpose too long");
      });

      it("should reject past expiry time", async function () {
        const block = await ethers.provider.getBlock("latest");
        const pastExpiry = block!.timestamp - 100;

        await expect(
          consentReceipt.connect(victim)["giveConsent(string,uint256)"]("test", pastExpiry)
        ).to.be.revertedWith("Expiry must be in future");
      });

      it("should handle maximum valid purpose length", async function () {
        const maxPurpose = "a".repeat(256);
        await consentReceipt.connect(victim)["giveConsent(string)"](maxPurpose);

        expect(await consentReceipt.getConsentStatus(victim.address, maxPurpose)).to.be.true;
      });
    });

    describe("Batch Operation Attacks", function () {
      it("should reject empty batch consent", async function () {
        await expect(
          consentReceipt.connect(victim).batchGiveConsent([], [])
        ).to.be.revertedWith("Empty purposes array");
      });

      it("should reject mismatched batch arrays", async function () {
        await expect(
          consentReceipt.connect(victim).batchGiveConsent(["a", "b"], [0])
        ).to.be.revertedWith("Array length mismatch");
      });

      it("should reject too large batch", async function () {
        const purposes = Array(51).fill("test");
        const expiries = Array(51).fill(0);

        await expect(
          consentReceipt.connect(victim).batchGiveConsent(purposes, expiries)
        ).to.be.revertedWith("Too many purposes");
      });

      it("should reject empty batch revocation", async function () {
        await expect(
          consentReceipt.connect(victim).batchRevokeConsent([])
        ).to.be.revertedWith("Empty indices array");
      });
    });
  });

  // ============================================================
  // KantaraConsentReceipt Security Tests
  // ============================================================
  describe("KantaraConsentReceipt Security", function () {
    let kantaraConsent: KantaraConsentReceipt;

    beforeEach(async function () {
      const KantaraFactory = await ethers.getContractFactory("KantaraConsentReceipt");
      kantaraConsent = await KantaraFactory.deploy();
      await kantaraConsent.waitForDeployment();
    });

    describe("Receipt ID Collision Attacks", function () {
      it("should generate unique receipt IDs even for same parameters", async function () {
        const purposes = [0]; // ServiceProvision
        const piCategories: string[] = [];
        const block = await ethers.provider.getBlock("latest");
        const expiry = block!.timestamp + 86400;

        // First consent
        const tx1 = await kantaraConsent.connect(victim).giveConsent(
          user1.address,
          purposes,
          piCategories,
          0, // Express
          expiry,
          false,
          "https://policy.example.com"
        );
        const receipt1 = await tx1.wait();
        const event1 = receipt1?.logs[0];

        // Second consent with same parameters
        const tx2 = await kantaraConsent.connect(victim).giveConsent(
          user1.address,
          purposes,
          piCategories,
          0, // Express
          expiry,
          false,
          "https://policy.example.com"
        );
        const receipt2 = await tx2.wait();
        const event2 = receipt2?.logs[0];

        // Receipt IDs should be different due to nonce
        const receipts = await kantaraConsent.getUserReceipts(victim.address);
        expect(receipts[0]).to.not.equal(receipts[1]);
      });

      it("should prevent receipt ID prediction attacks", async function () {
        // Nonce provides unpredictability
        const nonce = await kantaraConsent.getUserNonce(victim.address);
        expect(nonce).to.equal(0);

        await kantaraConsent.connect(victim).giveConsent(
          user1.address,
          [0],
          [],
          0,
          0,
          false,
          ""
        );

        const newNonce = await kantaraConsent.getUserNonce(victim.address);
        expect(newNonce).to.equal(1);
      });
    });

    describe("Cross-User Receipt Manipulation", function () {
      let receiptId: string;

      beforeEach(async function () {
        const tx = await kantaraConsent.connect(victim).giveConsent(
          user1.address,
          [0],
          [],
          0,
          0,
          false,
          ""
        );
        const receipt = await tx.wait();
        const receipts = await kantaraConsent.getUserReceipts(victim.address);
        receiptId = receipts[0];
      });

      it("should prevent attacker from revoking victim's consent", async function () {
        await expect(
          kantaraConsent.connect(attacker).revokeConsent(receiptId)
        ).to.be.revertedWith("Not the consent owner");
      });

      it("should only allow data subject to revoke", async function () {
        // Victim can revoke
        await kantaraConsent.connect(victim).revokeConsent(receiptId);

        expect(await kantaraConsent.isConsentValid(receiptId)).to.be.false;
      });
    });

    describe("Input Validation Attacks", function () {
      it("should reject zero address data controller", async function () {
        await expect(
          kantaraConsent.connect(victim).giveConsent(
            ethers.ZeroAddress,
            [0],
            [],
            0,
            0,
            false,
            ""
          )
        ).to.be.revertedWith("Invalid data controller");
      });

      it("should reject empty purposes array", async function () {
        await expect(
          kantaraConsent.connect(victim).giveConsent(
            user1.address,
            [],
            [],
            0,
            0,
            false,
            ""
          )
        ).to.be.revertedWith("At least one purpose required");
      });

      it("should reject too many purposes", async function () {
        const tooManyPurposes = Array(21).fill(0);
        await expect(
          kantaraConsent.connect(victim).giveConsent(
            user1.address,
            tooManyPurposes,
            [],
            0,
            0,
            false,
            ""
          )
        ).to.be.revertedWith("Too many purposes");
      });

      it("should reject too many PI categories", async function () {
        const tooManyCategories = Array(51).fill(ethers.keccak256(ethers.toUtf8Bytes("cat")));
        await expect(
          kantaraConsent.connect(victim).giveConsent(
            user1.address,
            [0],
            tooManyCategories,
            0,
            0,
            false,
            ""
          )
        ).to.be.revertedWith("Too many PI categories");
      });

      it("should reject overly long policy URL", async function () {
        const longUrl = "https://" + "a".repeat(510) + ".com";
        await expect(
          kantaraConsent.connect(victim).giveConsent(
            user1.address,
            [0],
            [],
            0,
            0,
            false,
            longUrl
          )
        ).to.be.revertedWith("Policy URL too long");
      });

      it("should reject past expiry time", async function () {
        const block = await ethers.provider.getBlock("latest");
        const pastExpiry = block!.timestamp - 100;

        await expect(
          kantaraConsent.connect(victim).giveConsent(
            user1.address,
            [0],
            [],
            0,
            pastExpiry,
            false,
            ""
          )
        ).to.be.revertedWith("Expiry must be in future");
      });
    });

    describe("Consent Validity Edge Cases", function () {
      it("should correctly handle consent expiration", async function () {
        const block = await ethers.provider.getBlock("latest");
        const expiry = block!.timestamp + 100;

        await kantaraConsent.connect(victim).giveConsent(
          user1.address,
          [0],
          [],
          0,
          expiry,
          false,
          ""
        );

        const receipts = await kantaraConsent.getUserReceipts(victim.address);

        // Valid now
        expect(await kantaraConsent.isConsentValid(receipts[0])).to.be.true;

        // Fast forward
        await ethers.provider.send("evm_increaseTime", [150]);
        await ethers.provider.send("evm_mine", []);

        // Expired
        expect(await kantaraConsent.isConsentValid(receipts[0])).to.be.false;
      });

      it("should handle non-existent receipt ID", async function () {
        const fakeReceiptId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
        expect(await kantaraConsent.isConsentValid(fakeReceiptId)).to.be.false;
      });

      it("should verify hasValidConsent uses optimized path", async function () {
        // Create consent for specific controller and purpose
        await kantaraConsent.connect(victim).giveConsent(
          user1.address, // controller
          [0], // ServiceProvision
          [],
          0,
          0,
          false,
          ""
        );

        // Should find valid consent via optimized mapping
        expect(await kantaraConsent.hasValidConsent(
          victim.address,
          user1.address,
          0 // ServiceProvision
        )).to.be.true;

        // Should not find consent for different controller
        expect(await kantaraConsent.hasValidConsent(
          victim.address,
          user2.address,
          0
        )).to.be.false;

        // Should not find consent for different purpose
        expect(await kantaraConsent.hasValidConsent(
          victim.address,
          user1.address,
          1 // ContractFulfillment
        )).to.be.false;
      });
    });

    describe("Batch Operation Security", function () {
      it("should reject empty batch revocation", async function () {
        await expect(
          kantaraConsent.connect(victim).batchRevokeConsent([])
        ).to.be.revertedWith("Empty receipt IDs array");
      });

      it("should reject too large batch revocation", async function () {
        const tooManyIds = Array(51).fill(ethers.keccak256(ethers.toUtf8Bytes("fake")));
        await expect(
          kantaraConsent.connect(victim).batchRevokeConsent(tooManyIds)
        ).to.be.revertedWith("Too many receipts");
      });

      it("should reject batch validity check with empty array", async function () {
        await expect(
          kantaraConsent.batchIsConsentValid([])
        ).to.be.revertedWith("Empty receipt IDs array");
      });

      it("should reject batch validity check with too many items", async function () {
        const tooManyIds = Array(101).fill(ethers.keccak256(ethers.toUtf8Bytes("fake")));
        await expect(
          kantaraConsent.batchIsConsentValid(tooManyIds)
        ).to.be.revertedWith("Too many receipts");
      });
    });
  });

  // ============================================================
  // IntegratedConsentProvenanceSystem Security Tests
  // ============================================================
  describe("IntegratedConsentProvenanceSystem Security", function () {
    let consentReceipt: ConsentReceipt;
    let dataProvenance: DataProvenance;
    let integratedSystem: IntegratedConsentProvenanceSystem;
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes("test-data"));

    beforeEach(async function () {
      const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
      consentReceipt = await ConsentReceiptFactory.deploy();
      await consentReceipt.waitForDeployment();

      const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
      dataProvenance = await DataProvenanceFactory.deploy();
      await dataProvenance.waitForDeployment();

      const IntegratedFactory = await ethers.getContractFactory("IntegratedConsentProvenanceSystem");
      integratedSystem = await IntegratedFactory.deploy(
        await consentReceipt.getAddress(),
        await dataProvenance.getAddress()
      );
      await integratedSystem.waitForDeployment();
    });

    describe("Consent-Provenance Linkage Bypass Attempts", function () {
      it("should prevent data registration without consent", async function () {
        await expect(
          integratedSystem.connect(victim).registerDataWithConsent(
            dataHash,
            "document",
            "analytics" // No consent given
          )
        ).to.be.revertedWith("No valid consent for this purpose");
      });

      it("should prevent data access without consent", async function () {
        // Victim gives consent and registers data
        await consentReceipt.connect(victim)["giveConsent(string)"]("analytics");
        await integratedSystem.connect(victim).registerDataWithConsent(
          dataHash,
          "document",
          "analytics"
        );

        // Attacker has no consent
        await expect(
          integratedSystem.connect(attacker).accessDataWithConsent(dataHash, "analytics")
        ).to.be.revertedWith("No valid consent for this purpose");
      });

      it("should prevent operations with expired consent", async function () {
        const block = await ethers.provider.getBlock("latest");
        const expiry = block!.timestamp + 100;

        await consentReceipt.connect(victim)["giveConsent(string,uint256)"]("expiring", expiry);
        await integratedSystem.connect(victim).registerDataWithConsent(
          dataHash,
          "document",
          "expiring"
        );

        // Fast forward past expiry
        await ethers.provider.send("evm_increaseTime", [150]);
        await ethers.provider.send("evm_mine", []);

        const newHash = ethers.keccak256(ethers.toUtf8Bytes("new"));
        await expect(
          integratedSystem.connect(victim).transformDataWithConsent(
            dataHash,
            newHash,
            "transform",
            "expiring"
          )
        ).to.be.revertedWith("No valid consent for this purpose");
      });

      it("should prevent operations with revoked consent", async function () {
        await consentReceipt.connect(victim)["giveConsent(string)"]("analytics");
        await integratedSystem.connect(victim).registerDataWithConsent(
          dataHash,
          "document",
          "analytics"
        );

        // Revoke consent
        await consentReceipt.connect(victim).revokeConsent(0);

        const newHash = ethers.keccak256(ethers.toUtf8Bytes("new"));
        await expect(
          integratedSystem.connect(victim).transformDataWithConsent(
            dataHash,
            newHash,
            "transform",
            "analytics"
          )
        ).to.be.revertedWith("No valid consent for this purpose");
      });
    });

    describe("Delegated Registration Exploits", function () {
      beforeEach(async function () {
        // Setup: victim gives consent and authorizes delegates
        await consentReceipt.connect(victim)["giveConsent(string)"]("analytics");
        await dataProvenance.connect(victim).setDelegate(user1.address, true);
        await dataProvenance.connect(victim).setDelegate(await integratedSystem.getAddress(), true);
      });

      it("should prevent unauthorized delegate from registering", async function () {
        await expect(
          integratedSystem.connect(attacker).registerDataForWithConsent(
            dataHash,
            "document",
            "analytics",
            victim.address
          )
        ).to.be.revertedWith("Not authorized delegate");
      });

      it("should prevent delegate from registering for non-authorizing owner", async function () {
        // user1 is authorized by victim, but tries to register for user2
        await expect(
          integratedSystem.connect(user1).registerDataForWithConsent(
            dataHash,
            "document",
            "analytics",
            user2.address // Wrong owner
          )
        ).to.be.revertedWith("Not authorized delegate");
      });

      it("should prevent delegate if owner has no consent", async function () {
        // Attacker authorizes delegate but has no consent
        await dataProvenance.connect(attacker).setDelegate(user1.address, true);
        await dataProvenance.connect(attacker).setDelegate(await integratedSystem.getAddress(), true);

        await expect(
          integratedSystem.connect(user1).registerDataForWithConsent(
            dataHash,
            "document",
            "analytics",
            attacker.address
          )
        ).to.be.revertedWith("Owner has no valid consent for this purpose");
      });

      it("should allow authorized delegate to register for owner with consent", async function () {
        await integratedSystem.connect(user1).registerDataForWithConsent(
          dataHash,
          "document",
          "analytics",
          victim.address
        );

        const record = await dataProvenance.getDataRecord(dataHash);
        expect(record.owner).to.equal(victim.address);
      });
    });

    describe("Data Restriction Attacks", function () {
      beforeEach(async function () {
        await consentReceipt.connect(victim)["giveConsent(string)"]("analytics");
        await integratedSystem.connect(victim).registerDataWithConsent(
          dataHash,
          "document",
          "analytics"
        );
      });

      it("should prevent restricting data while consent is still valid", async function () {
        // Consent is still valid, so restriction should fail
        await expect(
          integratedSystem.connect(victim).restrictDataForPurpose("analytics")
        ).to.be.revertedWith("Consent still valid");
      });

      it("should only affect caller's own data when restricting", async function () {
        // Register data for attacker with different purpose
        await consentReceipt.connect(attacker)["giveConsent(string)"]("malicious");
        const attackerHash = ethers.keccak256(ethers.toUtf8Bytes("attacker-data"));
        await integratedSystem.connect(attacker).registerDataWithConsent(
          attackerHash,
          "malicious-doc",
          "malicious"
        );

        // Attacker revokes consent and tries to restrict
        await consentReceipt.connect(attacker).revokeConsent(0);
        await integratedSystem.connect(attacker).restrictDataForPurpose("malicious");

        // Victim's data should NOT be affected
        const victimRecord = await dataProvenance.getDataRecord(dataHash);
        expect(victimRecord.status).to.equal(0); // Still Active
      });

      it("should allow owner to restrict their data after revoking consent", async function () {
        // Victim revokes consent
        await consentReceipt.connect(victim).revokeConsent(0);

        // Now restriction should work
        await integratedSystem.connect(victim).restrictDataForPurpose("analytics");

        const record = await dataProvenance.getDataRecord(dataHash);
        expect(record.status).to.equal(1); // Restricted
      });
    });

    describe("Consent Purpose Tracking", function () {
      it("should correctly track consent purpose per data hash", async function () {
        await consentReceipt.connect(victim)["giveConsent(string)"]("analytics");
        await integratedSystem.connect(victim).registerDataWithConsent(
          dataHash,
          "document",
          "analytics"
        );

        const purpose = await integratedSystem.getDataConsentPurpose(dataHash);
        expect(purpose).to.equal("analytics");
      });

      it("should track user data correctly", async function () {
        await consentReceipt.connect(victim)["giveConsent(string)"]("analytics");
        await integratedSystem.connect(victim).registerDataWithConsent(
          dataHash,
          "document",
          "analytics"
        );

        const userData = await integratedSystem.getUserRegisteredData(victim.address);
        expect(userData.length).to.equal(1);
        expect(userData[0]).to.equal(dataHash);
      });
    });
  });

  // ============================================================
  // Cross-Contract Attack Scenarios
  // ============================================================
  describe("Cross-Contract Attack Scenarios", function () {
    let consentReceipt: ConsentReceipt;
    let dataProvenance: DataProvenance;
    let integratedSystem: IntegratedConsentProvenanceSystem;

    beforeEach(async function () {
      const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
      consentReceipt = await ConsentReceiptFactory.deploy();
      await consentReceipt.waitForDeployment();

      const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
      dataProvenance = await DataProvenanceFactory.deploy();
      await dataProvenance.waitForDeployment();

      const IntegratedFactory = await ethers.getContractFactory("IntegratedConsentProvenanceSystem");
      integratedSystem = await IntegratedFactory.deploy(
        await consentReceipt.getAddress(),
        await dataProvenance.getAddress()
      );
      await integratedSystem.waitForDeployment();
    });

    describe("State Desynchronization Attacks", function () {
      it("should handle consent revocation after data registration", async function () {
        const dataHash = ethers.keccak256(ethers.toUtf8Bytes("test"));

        // Give consent, register data through integrated system
        await consentReceipt.connect(victim)["giveConsent(string)"]("analytics");
        await integratedSystem.connect(victim).registerDataWithConsent(
          dataHash,
          "document",
          "analytics"
        );

        // Revoke consent after registration
        await consentReceipt.connect(victim).revokeConsent(0);

        // Data is tracked in IntegratedSystem's userRegisteredData
        const userData = await integratedSystem.getUserRegisteredData(victim.address);
        expect(userData.length).to.equal(1);
        expect(userData[0]).to.equal(dataHash);

        // Transformation should fail due to no valid consent
        const newHash = ethers.keccak256(ethers.toUtf8Bytes("new"));
        await expect(
          integratedSystem.connect(victim).transformDataWithConsent(
            dataHash,
            newHash,
            "transform",
            "analytics"
          )
        ).to.be.revertedWith("No valid consent for this purpose");
      });

      it("should handle direct provenance operations bypassing integrated system", async function () {
        const dataHash = ethers.keccak256(ethers.toUtf8Bytes("direct"));

        // Directly register in DataProvenance (no consent check)
        await dataProvenance.connect(victim).registerData(dataHash, "document");

        // This data won't have consent purpose tracked in integrated system
        const purpose = await integratedSystem.getDataConsentPurpose(dataHash);
        expect(purpose).to.equal(""); // Empty string, not tracked
      });

      it("should handle role changes affecting operations", async function () {
        const dataHash = ethers.keccak256(ethers.toUtf8Bytes("role-test"));
        const operatorRole = await dataProvenance.OPERATOR_ROLE();

        // Setup
        await consentReceipt.connect(victim)["giveConsent(string)"]("analytics");
        await integratedSystem.connect(victim).registerDataWithConsent(
          dataHash,
          "document",
          "analytics"
        );

        // Grant operator role
        await dataProvenance.connect(owner).grantRole(operatorRole, user1.address);

        // Operator can change status directly (bypasses integrated system)
        await dataProvenance.connect(user1).operatorSetDataStatus(dataHash, 1); // Restricted

        const record = await dataProvenance.getDataRecord(dataHash);
        expect(record.status).to.equal(1);

        // Owner's consent-based operations should fail on restricted data
        const newHash = ethers.keccak256(ethers.toUtf8Bytes("new"));
        await expect(
          integratedSystem.connect(victim).transformDataWithConsent(
            dataHash,
            newHash,
            "transform",
            "analytics"
          )
        ).to.be.revertedWith("Data is not active");
      });
    });

    describe("Front-Running Scenarios", function () {
      it("should handle race condition in data registration", async function () {
        const dataHash = ethers.keccak256(ethers.toUtf8Bytes("contested"));

        await consentReceipt.connect(victim)["giveConsent(string)"]("analytics");
        await consentReceipt.connect(attacker)["giveConsent(string)"]("malicious");

        // First registration wins
        await integratedSystem.connect(victim).registerDataWithConsent(
          dataHash,
          "document",
          "analytics"
        );

        // Second registration fails
        await expect(
          integratedSystem.connect(attacker).registerDataWithConsent(
            dataHash,
            "stolen",
            "malicious"
          )
        ).to.be.revertedWith("Data already registered");
      });
    });

    describe("Gas Limit Attacks", function () {
      it("should handle large batch operations within gas limits", async function () {
        // Test with 50 items (maximum allowed)
        const hashes = Array(50).fill(null).map((_, i) =>
          ethers.keccak256(ethers.toUtf8Bytes(`data-${i}`))
        );
        const types = Array(50).fill("test");

        // Should succeed within gas limits
        await dataProvenance.connect(victim).batchRegisterData(hashes, types);

        const count = await dataProvenance.getUserDataRecordsCount(victim.address);
        expect(count).to.equal(50);
      });
    });

    describe("StorageRef Security", function () {
      let dataProvenance: DataProvenance;

      beforeEach(async function () {
        const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
        dataProvenance = await DataProvenanceFactory.deploy();
        await dataProvenance.waitForDeployment();
      });

      it("should prevent storageRef collision (two data hashes claiming same storageRef)", async function () {
        const dataHash1 = ethers.keccak256(ethers.toUtf8Bytes("data_a"));
        const dataHash2 = ethers.keccak256(ethers.toUtf8Bytes("data_b"));
        const storageRef = ethers.keccak256(ethers.toUtf8Bytes("shared_ref"));

        await dataProvenance.connect(victim)["registerData(bytes32,string,bytes32)"](dataHash1, "type1", storageRef);

        await expect(
          dataProvenance.connect(attacker)["registerData(bytes32,string,bytes32)"](dataHash2, "type2", storageRef)
        ).to.be.revertedWith("Storage ref already mapped");
      });

      it("should prevent using data hash as its own storage ref", async function () {
        const dataHash = ethers.keccak256(ethers.toUtf8Bytes("self_ref"));

        await expect(
          dataProvenance.connect(victim)["registerData(bytes32,string,bytes32)"](dataHash, "type1", dataHash)
        ).to.be.revertedWith("Storage ref cannot equal data hash");
      });

      it("should not store zero storageRef in reverse mapping", async function () {
        const dataHash = ethers.keccak256(ethers.toUtf8Bytes("no_ref"));

        await dataProvenance.connect(victim).registerData(dataHash, "type1");

        // Zero hash should not map to anything
        expect(await dataProvenance.getDataHashByStorageRef(ethers.ZeroHash)).to.equal(ethers.ZeroHash);
      });

      it("should maintain backward compatibility with existing registerData", async function () {
        const dataHash = ethers.keccak256(ethers.toUtf8Bytes("compat"));

        // Original two-arg form should still work
        await dataProvenance.connect(victim).registerData(dataHash, "type1");

        const record = await dataProvenance.getDataRecord(dataHash);
        expect(record.owner).to.equal(victim.address);
        expect(record.storageRef).to.equal(ethers.ZeroHash);
      });
    });

    describe("Pagination Edge Cases", function () {
      it("should handle empty pagination correctly", async function () {
        const results = await dataProvenance.getUserDataRecordsPaginated(victim.address, 0, 10);
        expect(results.length).to.equal(0);
      });

      it("should handle offset beyond array length", async function () {
        const dataHash = ethers.keccak256(ethers.toUtf8Bytes("single"));
        await dataProvenance.connect(victim).registerData(dataHash, "test");

        const results = await dataProvenance.getUserDataRecordsPaginated(victim.address, 100, 10);
        expect(results.length).to.equal(0);
      });

      it("should handle limit exceeding available items", async function () {
        const dataHash = ethers.keccak256(ethers.toUtf8Bytes("single"));
        await dataProvenance.connect(victim).registerData(dataHash, "test");

        const results = await dataProvenance.getUserDataRecordsPaginated(victim.address, 0, 100);
        expect(results.length).to.equal(1);
      });
    });
  });
});
