import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { Signer } from "ethers";
import {
  assertMainnetSigningSafe,
  getMainnetSafeAddress,
  isMainnetNetwork,
  mainnetLedgerAccounts,
} from "../../config/networks";

/**
 * Mainnet deploy with admin hand-off to a Gnosis Safe.
 *
 * The hand-off works on contract addresses, not on how they were deployed:
 * an Ignition module that deploys proxies only has to return futures named
 * dataProvenance, purposeRegistry and consentAuditLog (the addresses users
 * call), and the same steps apply.
 */

type Env = Record<string, string | undefined>;

/** A Safe must need at least this many signatures to count as a multisig. */
export const MIN_SAFE_THRESHOLD = 2n;

export interface AdminContracts {
  dataProvenance: string;
  purposeRegistry: string;
  consentAuditLog: string;
}

/** Safe contract versions the script accepts (Safe{Wallet} singletons). */
export const KNOWN_SAFE_VERSIONS = ["1.3.0", "1.4.1", "1.5.0"];

export const ADMIN_FUTURES = ["dataProvenance", "purposeRegistry", "consentAuditLog"] as const;

export interface SafeInfo {
  owners: string[];
  threshold: bigint;
  version: string;
}

const SAFE_ABI = [
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
  "function VERSION() view returns (string)",
];

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/** Optional MAINNET_SAFE_OWNERS: comma-separated owner addresses to expect. */
export function expectedSafeOwners(env: Env): string[] | undefined {
  const raw = (env.MAINNET_SAFE_OWNERS ?? "").trim();
  if (raw === "") return undefined;
  const owners = raw.split(",").map((o) => o.trim()).filter((o) => o !== "");
  const bad = owners.filter((o) => !ADDRESS_RE.test(o));
  if (bad.length > 0) throw new Error(`MAINNET_SAFE_OWNERS has invalid addresses: ${bad.join(", ")}`);
  return owners;
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Checks that `safe` is a deployed Safe on this chain with threshold >= 2. */
export async function checkSafe(
  hre: HardhatRuntimeEnvironment,
  safe: string,
  expectedOwners?: string[]
): Promise<SafeInfo> {
  const provider = hre.ethers.provider;
  const { chainId } = await provider.getNetwork();
  if ((await provider.getCode(safe)) === "0x") {
    throw new Error(
      `Safe ${safe} has no contract code on chain ${chainId}. ` +
        "Deploy the Safe on this network first, or fix MAINNET_SAFE_ADDRESS."
    );
  }
  const contract = new hre.ethers.Contract(safe, SAFE_ABI, provider);
  let owners: string[];
  let threshold: bigint;
  let version: string;
  try {
    owners = [...(await contract.getOwners())];
    threshold = await contract.getThreshold();
    version = await contract.VERSION();
  } catch {
    throw new Error(
      `Contract at ${safe} on chain ${chainId} does not answer getOwners()/getThreshold()/VERSION(); it is not a Gnosis Safe.`
    );
  }
  if (!KNOWN_SAFE_VERSIONS.includes(version)) {
    throw new Error(
      `Safe ${safe} reports VERSION() "${version}"; expected one of ${KNOWN_SAFE_VERSIONS.join(", ")}.`
    );
  }
  if (threshold < MIN_SAFE_THRESHOLD) {
    throw new Error(
      `Safe ${safe} has threshold ${threshold}; at least ${MIN_SAFE_THRESHOLD} signatures are required for mainnet admin rights.`
    );
  }
  if (BigInt(owners.length) < threshold) {
    throw new Error(`Safe ${safe} has ${owners.length} owners but threshold ${threshold}.`);
  }
  if (expectedOwners) {
    const have = new Set(owners.map((o) => o.toLowerCase()));
    const want = new Set(expectedOwners.map((o) => o.toLowerCase()));
    const missing = [...want].filter((o) => !have.has(o));
    const extra = [...have].filter((o) => !want.has(o));
    if (missing.length > 0 || extra.length > 0) {
      throw new Error(
        `Safe ${safe} owners do not match MAINNET_SAFE_OWNERS. ` +
          `Missing: [${missing.join(", ")}]. Unexpected: [${extra.join(", ")}].`
      );
    }
  }
  return { owners, threshold, version };
}

/** Pulls the admin-bearing contract addresses out of an Ignition deploy result. */
export async function adminContractsFromDeployment(
  result: Record<string, { getAddress(): Promise<string> }>
): Promise<AdminContracts> {
  const missing = ADMIN_FUTURES.filter((n) => !result[n]);
  if (missing.length > 0) {
    throw new Error(
      `Ignition module does not return ${missing.join(", ")}; cannot hand admin rights to the Safe.`
    );
  }
  return {
    dataProvenance: await result.dataProvenance.getAddress(),
    purposeRegistry: await result.purposeRegistry.getAddress(),
    consentAuditLog: await result.consentAuditLog.getAddress(),
  };
}

/** Checks, without deploying, that the module returns the admin-bearing futures. */
export function assertModuleHasAdminFutures(ignitionModule: any): void {
  const results = ignitionModule?.results;
  if (!results || typeof results !== "object") {
    throw new Error("MAINNET_IGNITION_MODULE does not export an Ignition module (no results).");
  }
  const missing = ADMIN_FUTURES.filter((n) => !(n in results));
  if (missing.length > 0) {
    throw new Error(
      `Ignition module "${ignitionModule.id}" does not return ${missing.join(", ")}; ` +
        "cannot hand admin rights to the Safe. Nothing was deployed."
    );
  }
}

/**
 * Moves every admin right from `deployer` to `safe`. Safe to re-run: steps
 * already done are skipped. Order matters on DataProvenance: the Safe gets
 * ADMIN_ROLE before the deployer renounces it, so the contract is never
 * without an admin.
 */
export async function handOffAdmin(
  hre: HardhatRuntimeEnvironment,
  contracts: AdminContracts,
  safe: string,
  deployer: Signer,
  log: (msg: string) => void = console.log
): Promise<void> {
  const deployerAddress = await deployer.getAddress();

  const dp = await hre.ethers.getContractAt("DataProvenance", contracts.dataProvenance, deployer);
  const ADMIN_ROLE = await dp.ADMIN_ROLE();
  if (!(await dp.hasRole(ADMIN_ROLE, safe))) {
    log(`DataProvenance: granting ADMIN_ROLE to Safe ${safe}`);
    await (await dp.grantRole(ADMIN_ROLE, safe)).wait();
  }
  if (await dp.hasRole(ADMIN_ROLE, deployerAddress)) {
    if (!(await dp.hasRole(ADMIN_ROLE, safe))) {
      throw new Error("DataProvenance: Safe does not hold ADMIN_ROLE; not renouncing the deployer's.");
    }
    log("DataProvenance: deployer renouncing ADMIN_ROLE");
    await (await dp.renounceRole(ADMIN_ROLE)).wait();
  }

  for (const name of ["PurposeRegistry", "ConsentAuditLog"] as const) {
    const address = name === "PurposeRegistry" ? contracts.purposeRegistry : contracts.consentAuditLog;
    const c = await hre.ethers.getContractAt(name, address, deployer);
    const admin: string = await c.admin();
    if (same(admin, safe)) continue;
    if (!same(admin, deployerAddress)) {
      throw new Error(`${name} admin is ${admin}, neither the deployer nor the Safe. Stopping.`);
    }
    log(`${name}: transferring admin to Safe ${safe}`);
    await (await c.transferAdmin(safe)).wait();
  }
}

/**
 * Post-deploy smoke reads. Throws listing every check that failed; returns
 * the readout when all pass.
 */
export async function verifyHandoff(
  hre: HardhatRuntimeEnvironment,
  contracts: AdminContracts,
  safe: string,
  deployerAddress: string
): Promise<Record<string, string>> {
  const dp = await hre.ethers.getContractAt("DataProvenance", contracts.dataProvenance);
  const pr = await hre.ethers.getContractAt("PurposeRegistry", contracts.purposeRegistry);
  const al = await hre.ethers.getContractAt("ConsentAuditLog", contracts.consentAuditLog);
  const ADMIN_ROLE = await dp.ADMIN_ROLE();
  const OPERATOR_ROLE = await dp.OPERATOR_ROLE();
  const AUDITOR_ROLE = await dp.AUDITOR_ROLE();

  const adminCount = await dp.getRoleMemberCount(ADMIN_ROLE);
  const adminMembers: string[] = [];
  for (let i = 0n; i < adminCount; i++) adminMembers.push(await dp.getRoleMember(ADMIN_ROLE, i));
  const prAdmin: string = await pr.admin();
  const alAdmin: string = await al.admin();
  const purposeCount = await pr.getPurposeCount();

  const failures: string[] = [];
  if (!(adminMembers.length === 1 && same(adminMembers[0], safe))) {
    failures.push(`DataProvenance ADMIN_ROLE members are [${adminMembers.join(", ")}], expected only the Safe`);
  }
  if (await dp.hasRole(ADMIN_ROLE, deployerAddress)) {
    failures.push("DataProvenance: deployer still holds ADMIN_ROLE");
  }
  const operatorCount = await dp.getRoleMemberCount(OPERATOR_ROLE);
  const auditorCount = await dp.getRoleMemberCount(AUDITOR_ROLE);
  if (await dp.hasRole(OPERATOR_ROLE, deployerAddress)) failures.push("DataProvenance: deployer holds OPERATOR_ROLE");
  if (await dp.hasRole(AUDITOR_ROLE, deployerAddress)) failures.push("DataProvenance: deployer holds AUDITOR_ROLE");
  // On a fresh deploy nobody holds these; the Safe grants them afterwards.
  if (operatorCount !== 0n) failures.push(`DataProvenance OPERATOR_ROLE has ${operatorCount} members, expected 0 on a fresh deploy`);
  if (auditorCount !== 0n) failures.push(`DataProvenance AUDITOR_ROLE has ${auditorCount} members, expected 0 on a fresh deploy`);
  if (!same(prAdmin, safe)) failures.push(`PurposeRegistry admin is ${prAdmin}, expected the Safe`);
  if (!same(alAdmin, safe)) failures.push(`ConsentAuditLog admin is ${alAdmin}, expected the Safe`);
  if (purposeCount === 0n) failures.push("PurposeRegistry has no purposes registered");

  if (failures.length > 0) {
    throw new Error("Post-deploy checks failed:\n  - " + failures.join("\n  - "));
  }
  return {
    "DataProvenance ADMIN_ROLE": adminMembers.join(", "),
    "DataProvenance OPERATOR_ROLE members": operatorCount.toString(),
    "DataProvenance AUDITOR_ROLE members": auditorCount.toString(),
    "PurposeRegistry admin": prAdmin,
    "ConsentAuditLog admin": alAdmin,
    "PurposeRegistry purposes": purposeCount.toString(),
  };
}

export interface DeployOptions {
  // Ignition module; typed loosely so any module (plain or proxy) fits.
  ignitionModule: any;
  env: Env;
  /** CLI sets true: refuse anything but a mainnet network. Tests set false. */
  requireMainnet: boolean;
  /**
   * Sign as MAINNET_DEPLOYER_ADDRESS (the Ledger account) and refuse if the
   * provider does not expose it. Defaults to true on mainnet networks; tests
   * set it explicitly to exercise the check on the local network.
   */
  ledgerSigning?: boolean;
  displayUi?: boolean;
  log?: (msg: string) => void;
}

export interface DeployResult {
  contracts: AdminContracts;
  safe: string;
  safeInfo: SafeInfo;
  deployer: string;
  readout: Record<string, string>;
}

/**
 * Preflight, deploy, hand off, verify. Every preflight check runs before the
 * first transaction is sent, so a misconfigured run spends nothing.
 */
export async function deployWithSafeHandoff(
  hre: HardhatRuntimeEnvironment,
  opts: DeployOptions
): Promise<DeployResult> {
  const log = opts.log ?? console.log;
  const { chainId } = await hre.ethers.provider.getNetwork();
  const mainnet = isMainnetNetwork(hre.network.name, Number(chainId));

  if (opts.requireMainnet && !mainnet) {
    throw new Error(
      `Network "${hre.network.name}" (chain ${chainId}) is not a mainnet network. ` +
        "Use the testnet Ignition flow (npm run deploy:ignition:<network>)."
    );
  }
  if (mainnet) {
    assertMainnetSigningSafe(hre.network.name, hre.network.config, opts.env);
  }

  // Refuse before deploying anything if the module cannot be handed off or
  // there is nowhere to hand admin rights.
  assertModuleHasAdminFutures(opts.ignitionModule);
  const safe = getMainnetSafeAddress(opts.env);
  const safeInfo = await checkSafe(hre, safe, expectedSafeOwners(opts.env));

  let deployer: Signer;
  if (opts.ledgerSigning ?? mainnet) {
    const [expected] = mainnetLedgerAccounts(opts.env);
    if (!expected) throw new Error("MAINNET_DEPLOYER_ADDRESS is not set.");
    let accounts: string[];
    try {
      accounts = (await hre.network.provider.request({ method: "eth_accounts" })) as string[];
    } catch (e) {
      throw new Error(
        `eth_accounts failed on ${hre.network.name} (${e instanceof Error ? e.message : e}). ` +
          "hardhat-ledger needs an RPC endpoint that answers eth_accounts; set a different RPC URL."
      );
    }
    if (!accounts.some((a) => same(a, expected))) {
      throw new Error(
        `Signer ${expected} (MAINNET_DEPLOYER_ADDRESS) is not among the accounts Hardhat exposes on ` +
          `${hre.network.name}. Is the network configured with ledgerAccounts and no \`accounts\`?`
      );
    }
    // Pick the Ledger account by address: with accounts "remote", any accounts
    // the RPC node itself reports come first in eth_accounts.
    deployer = await hre.ethers.getSigner(expected);
  } else {
    const [first] = await hre.ethers.getSigners();
    if (!first) throw new Error("No signer available.");
    deployer = first;
  }
  const deployerAddress = await deployer.getAddress();
  if (same(safe, deployerAddress)) {
    throw new Error("MAINNET_SAFE_ADDRESS is the deployer itself; it must be a separate multisig.");
  }

  log(`Network:  ${hre.network.name} (chain ${chainId})`);
  log(`Deployer: ${deployerAddress}`);
  log(`Safe:     ${safe} (${safeInfo.threshold} of ${safeInfo.owners.length})`);

  const result = await hre.ignition.deploy(opts.ignitionModule, {
    defaultSender: deployerAddress,
    displayUi: opts.displayUi ?? false,
  });
  const contracts = await adminContractsFromDeployment(result as any);

  await handOffAdmin(hre, contracts, safe, deployer, log);
  const readout = await verifyHandoff(hre, contracts, safe, deployerAddress);

  return { contracts, safe, safeInfo, deployer: deployerAddress, readout };
}
