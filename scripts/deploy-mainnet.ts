import hre from "hardhat";
import * as path from "path";
import { MAINNET_NETWORKS } from "../config/networks";
import { deployWithSafeHandoff } from "./lib/mainnet-deploy";

/**
 * Mainnet deploy: Ledger-signed Ignition deploy, then admin rights to the Safe.
 *
 *   MAINNET_IGNITION_MODULE=ignition/modules/ConsentSystemV3.ts \
 *     npx hardhat run scripts/deploy-mainnet.ts --network <mainnet|gnosis|base>
 *
 * See docs/mainnet-deployment.md before running this.
 */
async function main() {
  const modulePath = process.env.MAINNET_IGNITION_MODULE;
  if (!modulePath) {
    throw new Error(
      "Set MAINNET_IGNITION_MODULE to the Ignition module to deploy, e.g. ignition/modules/ConsentSystemV3.ts."
    );
  }
  const ignitionModule = (await import(path.resolve(modulePath))).default;

  const result = await deployWithSafeHandoff(hre, {
    ignitionModule,
    env: process.env,
    requireMainnet: true,
    displayUi: true,
  });

  const explorer = MAINNET_NETWORKS[hre.network.name]?.explorer;
  console.log("\n=== Admin hand-off verified ===");
  for (const [k, v] of Object.entries(result.readout)) console.log(`${k}: ${v}`);
  console.log("\nNext steps (docs/mainnet-deployment.md):");
  console.log("  1. npm run post-deploy");
  console.log(`  2. Verify contracts: npx hardhat ignition verify chain-${(await hre.ethers.provider.getNetwork()).chainId} --network ${hre.network.name}`);
  if (explorer) console.log(`  3. Check the Safe and contracts on ${explorer}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
