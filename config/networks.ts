import type { NetworksUserConfig, NetworkConfig } from "hardhat/types";

/**
 * Network definitions and the mainnet signing guard.
 *
 * Testnets sign with a plaintext key from TESTNET_DEPLOYER_PRIVATE_KEY.
 * Mainnets never take a plaintext key: they sign on a Ledger hardware wallet
 * (@nomicfoundation/hardhat-ledger) for the address in MAINNET_DEPLOYER_ADDRESS.
 * The two flows read disjoint environment variables, so a testnet key cannot
 * reach a mainnet network.
 */

type Env = Record<string, string | undefined>;

interface NetworkMeta {
  chainId: number;
  rpcEnv: string;
  defaultRpc: string;
  explorer: string;
}

export const TESTNET_NETWORKS: Record<string, NetworkMeta> = {
  sepolia: {
    chainId: 11155111,
    rpcEnv: "SEPOLIA_RPC_URL",
    defaultRpc: "https://rpc.sepolia.org",
    explorer: "https://sepolia.etherscan.io",
  },
  chiado: {
    chainId: 10200,
    rpcEnv: "CHIADO_RPC_URL",
    defaultRpc: "https://rpc.chiadochain.net",
    explorer: "https://gnosis-chiado.blockscout.com",
  },
  baseSepolia: {
    chainId: 84532,
    rpcEnv: "BASE_SEPOLIA_RPC_URL",
    defaultRpc: "https://sepolia.base.org",
    explorer: "https://base-sepolia.blockscout.com",
  },
};

export const MAINNET_NETWORKS: Record<string, NetworkMeta> = {
  mainnet: {
    chainId: 1,
    rpcEnv: "MAINNET_ETHEREUM_RPC_URL",
    defaultRpc: "https://ethereum-rpc.publicnode.com",
    explorer: "https://etherscan.io",
  },
  gnosis: {
    chainId: 100,
    rpcEnv: "MAINNET_GNOSIS_RPC_URL",
    defaultRpc: "https://rpc.gnosischain.com",
    explorer: "https://gnosis.blockscout.com",
  },
  base: {
    chainId: 8453,
    rpcEnv: "MAINNET_BASE_RPC_URL",
    // mainnet.base.org rejects eth_accounts, which hardhat-ledger needs.
    defaultRpc: "https://base-rpc.publicnode.com",
    explorer: "https://base.blockscout.com",
  },
};

const MAINNET_CHAIN_IDS = new Set(
  Object.values(MAINNET_NETWORKS).map((n) => n.chainId)
);

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const PRIVATE_KEY_RE = /^(0x)?[0-9a-fA-F]{64}$/;
// Names that say "this is a private key / mnemonic / seed" (any case, anywhere
// in the name), e.g. MAINNET_PRIVATE_KEY, private_key_mainnet. These can never
// be exempted with MAINNET_ALLOW_ENV.
const CORE_SECRET_NAME_RE = /(PRIV(ATE)?_?KEY|MNEMONIC|SEED_?PHRASE)/i;
// Names that often hold a key but may not, e.g. DEPLOYER_KEY, SIGNER_KEY.
const OTHER_SECRET_NAME_RE = /(DEPLOYER|SIGNER|WALLET)_?KEY/i;
// A *_PATH or *_ID name points at a key (a file, a KMS key ID) rather than
// holding one, so the name alone is not flagged; its value is still checked.
const REFERENCE_NAME_RE = /_(PATH|ID)$/i;
const TESTNET_PREFIX_RE = /^TESTNET_/i;

/** A network is mainnet if its name or its chain ID is a known mainnet. */
export function isMainnetNetwork(name: string, chainId?: number): boolean {
  return (
    Object.prototype.hasOwnProperty.call(MAINNET_NETWORKS, name) ||
    (chainId !== undefined && MAINNET_CHAIN_IDS.has(chainId))
  );
}

/**
 * Names from MAINNET_ALLOW_ENV (comma-separated): variables the operator has
 * confirmed are not keys, e.g. a 32-byte DEPLOY_SALT. Names matching the core
 * private-key / mnemonic / seed patterns are never exempt, even if listed.
 */
export function mainnetAllowedEnvNames(env: Env): Set<string> {
  return new Set(
    (env.MAINNET_ALLOW_ENV ?? "")
      .split(",")
      .map((n) => n.trim().toUpperCase())
      .filter((n) => n !== "" && !CORE_SECRET_NAME_RE.test(n))
  );
}

/**
 * Names of environment variables that hold, or look like they hold, a
 * plaintext signing key and are not namespaced to testnets: the name looks
 * like a signing key, or the value is 32 bytes of hex. Fails closed: false
 * positives (e.g. a CREATE2 salt) must be exempted explicitly with
 * MAINNET_ALLOW_ENV. Only names are returned, never values.
 */
export function findPlaintextMainnetSecrets(env: Env): string[] {
  const allowed = mainnetAllowedEnvNames(env);
  const nameLooksLikeKey = (name: string) =>
    !REFERENCE_NAME_RE.test(name) && (CORE_SECRET_NAME_RE.test(name) || OTHER_SECRET_NAME_RE.test(name));
  return Object.keys(env)
    .filter((name) => !TESTNET_PREFIX_RE.test(name))
    .filter((name) => name.toUpperCase() !== "MAINNET_ALLOW_ENV")
    .filter((name) => (env[name] ?? "").trim() !== "")
    .filter((name) => nameLooksLikeKey(name) || PRIVATE_KEY_RE.test((env[name] ?? "").trim()))
    .filter((name) => !allowed.has(name.toUpperCase()))
    .sort();
}

/**
 * Ledger account for mainnet deploys, from MAINNET_DEPLOYER_ADDRESS.
 * Returns [] when unset. Throws if the value is not an address, and in
 * particular if it looks like a private key pasted into the wrong variable.
 */
export function mainnetLedgerAccounts(env: Env): string[] {
  const raw = (env.MAINNET_DEPLOYER_ADDRESS ?? "").trim();
  if (raw === "") return [];
  if (PRIVATE_KEY_RE.test(raw)) {
    throw new Error(
      "MAINNET_DEPLOYER_ADDRESS looks like a private key, not an address. " +
        "Remove it from your environment and .env now, and treat that key as compromised. " +
        "Set MAINNET_DEPLOYER_ADDRESS to the Ledger account's public address (0x + 40 hex chars)."
    );
  }
  if (!ADDRESS_RE.test(raw)) {
    throw new Error(
      `MAINNET_DEPLOYER_ADDRESS is not a valid address: expected 0x followed by 40 hex characters.`
    );
  }
  return [raw];
}

/** Gnosis Safe that receives admin rights after a mainnet deploy. */
export function getMainnetSafeAddress(env: Env): string {
  const raw = (env.MAINNET_SAFE_ADDRESS ?? "").trim();
  if (raw === "") {
    throw new Error(
      "Refusing to deploy to mainnet: MAINNET_SAFE_ADDRESS is not set. " +
        "Admin rights must be handed to a Gnosis Safe multisig after deploy. " +
        "See docs/mainnet-deployment.md."
    );
  }
  if (!ADDRESS_RE.test(raw)) {
    throw new Error(
      "MAINNET_SAFE_ADDRESS is not a valid address: expected 0x followed by 40 hex characters."
    );
  }
  return raw;
}

/** Builds the Hardhat `networks` section from the environment. */
export function buildNetworks(env: Env): NetworksUserConfig {
  const testnetAccounts = env.TESTNET_DEPLOYER_PRIVATE_KEY
    ? [env.TESTNET_DEPLOYER_PRIVATE_KEY]
    : [];
  const ledgerAccounts = mainnetLedgerAccounts(env);

  const networks: NetworksUserConfig = {
    hardhat: { chainId: 31337 },
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
  };

  for (const [name, meta] of Object.entries(TESTNET_NETWORKS)) {
    networks[name] = {
      url: env[meta.rpcEnv] || meta.defaultRpc,
      chainId: meta.chainId,
      accounts: testnetAccounts,
    };
  }

  for (const [name, meta] of Object.entries(MAINNET_NETWORKS)) {
    networks[name] = {
      url: env[meta.rpcEnv] || meta.defaultRpc,
      chainId: meta.chainId,
      // No local keys, ever: signing happens on the Ledger device.
      // `accounts` is deliberately omitted (Hardhat's default "remote"). Any
      // array, even [], makes Hardhat wrap a LocalAccountsProvider OUTSIDE
      // hardhat-ledger's provider, which hides the Ledger account (eth_accounts
      // returns []) and sends fail with HH103.
      ledgerAccounts,
    };
  }

  return networks;
}

/**
 * Runtime guard, called when the Hardhat runtime is created for the selected
 * network. Throws if a mainnet network would sign with anything but the Ledger.
 */
export function assertMainnetSigningSafe(
  networkName: string,
  networkConfig: Pick<NetworkConfig, "chainId" | "accounts">,
  env: Env
): void {
  if (!isMainnetNetwork(networkName, networkConfig.chainId)) return;

  const secrets = findPlaintextMainnetSecrets(env);
  if (secrets.length > 0) {
    throw new Error(
      `Refusing to use mainnet network "${networkName}": these environment variables may hold a plaintext ` +
        `signing key (name looks like a signing key, or the value is 32 bytes of hex): ${secrets.join(", ")}. ` +
        `Mainnet deploys sign with a Ledger via MAINNET_DEPLOYER_ADDRESS. Remove them from your shell and .env. ` +
        `If one is not a key (e.g. a salt or hash), list it in MAINNET_ALLOW_ENV=NAME1,NAME2; names containing ` +
        `PRIVATE_KEY, PRIVKEY, MNEMONIC or SEED_PHRASE can never be allowed.`
    );
  }

  const accounts = networkConfig.accounts as unknown;
  if (accounts !== undefined && accounts !== "remote") {
    throw new Error(
      `Refusing to use mainnet network "${networkName}": it sets \`accounts\` (a key list, an empty list, ` +
        `or a mnemonic). Mainnet networks must leave accounts unset and sign via ledgerAccounts; ` +
        `even accounts: [] hides the Ledger account from Hardhat.`
    );
  }
}
