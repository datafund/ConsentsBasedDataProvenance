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
    defaultRpc: "https://mainnet.base.org",
    explorer: "https://base.blockscout.com",
  },
};

const MAINNET_CHAIN_IDS = new Set(
  Object.values(MAINNET_NETWORKS).map((n) => n.chainId)
);

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const PRIVATE_KEY_RE = /^(0x)?[0-9a-fA-F]{64}$/;
// Environment variable names that hold signing secrets.
const SECRET_NAME_RE = /(PRIVATE_KEY|MNEMONIC|SEED_PHRASE)$/;

/** A network is mainnet if its name or its chain ID is a known mainnet. */
export function isMainnetNetwork(name: string, chainId?: number): boolean {
  return (
    Object.prototype.hasOwnProperty.call(MAINNET_NETWORKS, name) ||
    (chainId !== undefined && MAINNET_CHAIN_IDS.has(chainId))
  );
}

/**
 * Names of environment variables holding a plaintext signing secret that is
 * not namespaced to testnets. Any of these present while targeting mainnet is
 * refused: mainnet keys must never live in a plaintext file.
 */
export function findPlaintextMainnetSecrets(env: Env): string[] {
  return Object.keys(env)
    .filter((name) => SECRET_NAME_RE.test(name))
    .filter((name) => !name.startsWith("TESTNET_"))
    .filter((name) => (env[name] ?? "").trim() !== "")
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
      // No local keys, ever. Signing happens on the Ledger device.
      accounts: [],
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
      `Refusing to use mainnet network "${networkName}": plaintext signing secrets are set in the environment ` +
        `(${secrets.join(", ")}). Mainnet deploys sign with a Ledger via MAINNET_DEPLOYER_ADDRESS. ` +
        `Remove these variables from your shell and .env.`
    );
  }

  const accounts = networkConfig.accounts as unknown;
  const noLocalAccounts =
    accounts === "remote" || (Array.isArray(accounts) && accounts.length === 0);
  if (!noLocalAccounts) {
    throw new Error(
      `Refusing to use mainnet network "${networkName}": it is configured with local accounts ` +
        `(a private key or mnemonic). Mainnet networks must set accounts: [] and sign via ledgerAccounts.`
    );
  }
}
