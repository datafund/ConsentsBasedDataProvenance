import { HardhatUserConfig, extendEnvironment } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition-ethers";
import "@nomicfoundation/hardhat-ledger";
import dotenv from "dotenv";
import { assertMainnetSigningSafe, buildNetworks } from "./config/networks";

dotenv.config();

// Mainnet networks (mainnet, gnosis, base) sign only with a Ledger. This runs
// for the selected network before any task touches it.
extendEnvironment((hre) => {
  assertMainnetSigningSafe(hre.network.name, hre.network.config, process.env);
});

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: buildNetworks(process.env),
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      chiado: "no-api-key-needed",
      baseSepolia: process.env.BASESCAN_API_KEY || "no-api-key-needed",
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      gnosis: "no-api-key-needed",
      base: "no-api-key-needed",
    },
    customChains: [
      {
        network: "chiado",
        chainId: 10200,
        urls: {
          apiURL: "https://gnosis-chiado.blockscout.com/api",
          browserURL: "https://gnosis-chiado.blockscout.com",
        },
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://base-sepolia.blockscout.com/api",
          browserURL: "https://base-sepolia.blockscout.com",
        },
      },
      {
        network: "gnosis",
        chainId: 100,
        urls: {
          apiURL: "https://gnosis.blockscout.com/api",
          browserURL: "https://gnosis.blockscout.com",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://base.blockscout.com/api",
          browserURL: "https://base.blockscout.com",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
