import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy ConsentReceipt
  console.log("\n1. Deploying ConsentReceipt...");
  const ConsentReceipt = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceipt.deploy();
  await consentReceipt.waitForDeployment();
  const consentReceiptAddress = await consentReceipt.getAddress();
  console.log("   ConsentReceipt deployed to:", consentReceiptAddress);

  // Deploy DataProvenance
  console.log("\n2. Deploying DataProvenance...");
  const DataProvenance = await ethers.getContractFactory("DataProvenance");
  const dataProvenance = await DataProvenance.deploy();
  await dataProvenance.waitForDeployment();
  const dataProvenanceAddress = await dataProvenance.getAddress();
  console.log("   DataProvenance deployed to:", dataProvenanceAddress);

  // Deploy IntegratedConsentProvenanceSystem
  console.log("\n3. Deploying IntegratedConsentProvenanceSystem...");
  const IntegratedSystem = await ethers.getContractFactory("IntegratedConsentProvenanceSystem");
  const integratedSystem = await IntegratedSystem.deploy(consentReceiptAddress, dataProvenanceAddress);
  await integratedSystem.waitForDeployment();
  const integratedSystemAddress = await integratedSystem.getAddress();
  console.log("   IntegratedConsentProvenanceSystem deployed to:", integratedSystemAddress);

  // Deploy KantaraConsentReceipt (standalone)
  console.log("\n4. Deploying KantaraConsentReceipt...");
  const KantaraConsentReceipt = await ethers.getContractFactory("KantaraConsentReceipt");
  const kantaraConsentReceipt = await KantaraConsentReceipt.deploy();
  await kantaraConsentReceipt.waitForDeployment();
  const kantaraConsentReceiptAddress = await kantaraConsentReceipt.getAddress();
  console.log("   KantaraConsentReceipt deployed to:", kantaraConsentReceiptAddress);

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ConsentReceipt: consentReceiptAddress,
      DataProvenance: dataProvenanceAddress,
      IntegratedConsentProvenanceSystem: integratedSystemAddress,
      KantaraConsentReceipt: kantaraConsentReceiptAddress,
    },
  };

  fs.writeFileSync("deployments.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\n Deployment info saved to deployments.json");

  console.log("\n=== Deployment Summary ===");
  console.log("ConsentReceipt:                    ", consentReceiptAddress);
  console.log("DataProvenance:                    ", dataProvenanceAddress);
  console.log("IntegratedConsentProvenanceSystem: ", integratedSystemAddress);
  console.log("KantaraConsentReceipt:             ", kantaraConsentReceiptAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
