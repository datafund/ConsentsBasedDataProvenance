/**
 * Example: Integrated Consent & Provenance System
 * Scenario: Getting Started
 * Persona: All Users
 *
 * This example demonstrates:
 * - The IntegratedConsentProvenanceSystem contract
 * - Consent-verified data operations
 * - Automatic consent checking before data access
 * - Data restriction on consent revocation
 * - Complete audit trail with consent linkage
 *
 * The IntegratedConsentProvenanceSystem is the main orchestrator that
 * ensures all data operations are backed by valid consent.
 *
 * Run with:
 * npx hardhat run examples/01-getting-started/04-integrated-system.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Example: Integrated Consent & Provenance System");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up the integrated system...\n");

  const [deployer, user, processor] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  User:      ${user.address.slice(0, 10)}... (Data owner)`);
  console.log(`  Processor: ${processor.address.slice(0, 10)}... (Data processor)`);

  // Deploy base contracts
  const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceiptFactory.deploy();
  await consentReceipt.waitForDeployment();

  const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
  const dataProvenance = await DataProvenanceFactory.deploy();
  await dataProvenance.waitForDeployment();

  // Deploy the integrated system
  const IntegratedFactory = await ethers.getContractFactory("IntegratedConsentProvenanceSystem");
  const integratedSystem = await IntegratedFactory.deploy(
    await consentReceipt.getAddress(),
    await dataProvenance.getAddress()
  );
  await integratedSystem.waitForDeployment();

  console.log(`\nContracts deployed:`);
  console.log(`  ConsentReceipt:    ${await consentReceipt.getAddress()}`);
  console.log(`  DataProvenance:    ${await dataProvenance.getAddress()}`);
  console.log(`  IntegratedSystem:  ${await integratedSystem.getAddress()}`);

  // === SCENARIO ===

  // Step 1: Try to register data WITHOUT consent (should fail)
  console.log("\n>>> Step 1: Attempt data registration WITHOUT consent");
  console.log("    The system enforces consent-first data operations.\n");

  const dataHash = ethers.keccak256(ethers.toUtf8Bytes("user_profile_data"));

  try {
    await integratedSystem.connect(user).registerDataWithConsent(
      dataHash,
      "user_profile",
      "data_storage"
    );
    console.log("    ✗ Should have failed!");
  } catch (error: any) {
    if (error.message.includes("No valid consent")) {
      console.log("    ✓ Correctly rejected: No valid consent for this purpose");
      console.log("      User must give consent before registering data.");
    }
  }

  // Step 2: User gives consent
  console.log("\n>>> Step 2: User gives consent for 'data_storage' purpose");

  await consentReceipt.connect(user)["giveConsent(string)"]("data_storage");
  console.log("    ✓ Consent granted for 'data_storage'");

  const hasConsent = await consentReceipt.getConsentStatus(user.address, "data_storage");
  console.log(`    Consent valid: ${hasConsent}`);

  // Step 3: Register data WITH consent
  console.log("\n>>> Step 3: Register data WITH consent");

  const tx = await integratedSystem.connect(user).registerDataWithConsent(
    dataHash,
    "user_profile",
    "data_storage"
  );
  const receipt = await tx.wait();

  console.log("    ✓ Data registered successfully");
  console.log(`      Hash: ${dataHash.slice(0, 25)}...`);
  console.log(`      Type: user_profile`);
  console.log(`      Consent Purpose: data_storage`);
  console.log(`      TX: ${receipt?.hash.slice(0, 25)}...`);

  // Step 4: Verify the consent-data linkage
  console.log("\n>>> Step 4: Verify consent-data linkage");

  const linkedPurpose = await integratedSystem.getDataConsentPurpose(dataHash);
  console.log(`    Data hash: ${dataHash.slice(0, 25)}...`);
  console.log(`    Linked consent purpose: ${linkedPurpose}`);

  const userDataHashes = await integratedSystem.getUserRegisteredData(user.address);
  console.log(`    User's registered data count: ${userDataHashes.length}`);

  // Step 5: Check if data access is allowed
  console.log("\n>>> Step 5: Check data access permissions");

  const accessAllowed = await integratedSystem.isDataAccessAllowed(user.address, dataHash);
  console.log(`    User access allowed: ${accessAllowed ? "YES ✓" : "NO"}`);

  // Processor doesn't have consent
  const processorAccessAllowed = await integratedSystem.isDataAccessAllowed(processor.address, dataHash);
  console.log(`    Processor access allowed: ${processorAccessAllowed ? "YES" : "NO ✗ (no consent)"}`);

  // Step 6: User adds more data under different consent
  console.log("\n>>> Step 6: Register data under different consent purpose");

  // Give analytics consent
  await consentReceipt.connect(user)["giveConsent(string)"]("analytics");
  console.log("    ✓ Consent granted for 'analytics'");

  const analyticsDataHash = ethers.keccak256(ethers.toUtf8Bytes("user_analytics_data"));
  await integratedSystem.connect(user).registerDataWithConsent(
    analyticsDataHash,
    "analytics_record",
    "analytics"
  );
  console.log("    ✓ Analytics data registered");

  // Step 7: View all user's registered data
  console.log("\n>>> Step 7: View all user's registered data");

  const allUserData = await integratedSystem.getUserRegisteredData(user.address);
  console.log(`\n    User has ${allUserData.length} data records:`);

  for (let i = 0; i < allUserData.length; i++) {
    const hash = allUserData[i];
    const purpose = await integratedSystem.getDataConsentPurpose(hash);
    console.log(`\n    Record ${i + 1}:`);
    console.log(`      Hash: ${hash.slice(0, 25)}...`);
    console.log(`      Consent Purpose: ${purpose}`);
  }

  // Step 8: Revoke consent and restrict data
  console.log("\n>>> Step 8: Revoke consent and restrict associated data");
  console.log("    When consent is revoked, associated data should be restricted.\n");

  // Revoke analytics consent
  await consentReceipt.connect(user).revokeConsent(1); // Index 1 = analytics
  console.log("    ✓ Analytics consent revoked");

  // Verify consent is revoked
  const analyticsConsentValid = await consentReceipt.getConsentStatus(user.address, "analytics");
  console.log(`    Analytics consent still valid: ${analyticsConsentValid ? "YES (ERROR!)" : "NO ✓"}`);

  // Now restrict data associated with that purpose
  await integratedSystem.connect(user).restrictDataForPurpose("analytics");
  console.log("    ✓ Data associated with 'analytics' purpose restricted");

  // Step 9: Verify access is no longer allowed
  console.log("\n>>> Step 9: Verify data access after revocation");

  const analyticsAccessAllowed = await integratedSystem.isDataAccessAllowed(user.address, analyticsDataHash);
  console.log(`    Analytics data access: ${analyticsAccessAllowed ? "YES (ERROR!)" : "NO ✓ (consent revoked)"}`);

  // Storage data should still be accessible
  const storageAccessAllowed = await integratedSystem.isDataAccessAllowed(user.address, dataHash);
  console.log(`    Storage data access: ${storageAccessAllowed ? "YES ✓ (consent still valid)" : "NO"}`);

  // === INTEGRATED SYSTEM SUMMARY ===

  console.log("\n" + "-".repeat(60));
  console.log("  Integrated System Summary");
  console.log("-".repeat(60));

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │      INTEGRATED CONSENT-PROVENANCE SYSTEM               │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │                                                          │");
  console.log("    │  ARCHITECTURE                                            │");
  console.log("    │                                                          │");
  console.log("    │    ┌─────────────────────────────────┐                  │");
  console.log("    │    │   IntegratedConsentProvenance   │                  │");
  console.log("    │    │          System                 │                  │");
  console.log("    │    └───────────────┬─────────────────┘                  │");
  console.log("    │                    │                                     │");
  console.log("    │         ┌──────────┴──────────┐                         │");
  console.log("    │         ▼                     ▼                         │");
  console.log("    │   ┌───────────┐        ┌───────────┐                    │");
  console.log("    │   │  Consent  │        │   Data    │                    │");
  console.log("    │   │  Receipt  │        │Provenance │                    │");
  console.log("    │   └───────────┘        └───────────┘                    │");
  console.log("    │                                                          │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  KEY FUNCTIONS                                           │");
  console.log("    │    • registerDataWithConsent() - Consent-verified reg   │");
  console.log("    │    • accessDataWithConsent() - Consent-verified access  │");
  console.log("    │    • transformDataWithConsent() - Consent-verified tx   │");
  console.log("    │    • restrictDataForPurpose() - Data restriction        │");
  console.log("    │    • isDataAccessAllowed() - Access check               │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  CONSENT-DATA LINKAGE                                    │");
  console.log("    │    • Every data record linked to consent purpose        │");
  console.log("    │    • Consent checked before every operation             │");
  console.log("    │    • Data restricted when consent revoked               │");
  console.log("    │    • Complete audit trail with consent references       │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • IntegratedSystem orchestrates consent + provenance");
  console.log("  • All data operations require valid consent first");
  console.log("  • Consent purpose linked to each data record");
  console.log("  • Data access checked against consent status");
  console.log("  • Consent revocation can cascade to data restriction");
  console.log("  • Provides unified API for consent-aware data management");
  console.log("\n  Use Cases:");
  console.log("  • GDPR-compliant data processing");
  console.log("  • Healthcare data with patient consent");
  console.log("  • Financial services with customer authorization");
  console.log("  • Any scenario requiring consent-backed data operations");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
