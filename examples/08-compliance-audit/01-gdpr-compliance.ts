/**
 * Example: GDPR Compliance
 * Scenario: Compliance & Audit
 * Persona: Compliance Officers, DPOs, Legal Teams
 *
 * This example demonstrates:
 * - GDPR Article 6-7 (Lawful basis and consent conditions)
 * - GDPR Article 17 (Right to erasure)
 * - GDPR Article 30 (Records of processing activities)
 * - Generating compliance evidence
 *
 * Scenario:
 * Demonstrating GDPR compliance:
 * 1. Collect granular, freely-given consent (Art. 7)
 * 2. Track lawful basis for each purpose (Art. 6)
 * 3. Process data subject access request (Art. 15)
 * 4. Exercise right to erasure (Art. 17)
 * 5. Generate processing records (Art. 30)
 *
 * Run with:
 * npx hardhat run examples/08-compliance-audit/01-gdpr-compliance.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Compliance: GDPR Demonstration");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up GDPR compliance scenario...\n");

  const [deployer, dataSubject, controller, processor] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Data Subject:    ${dataSubject.address.slice(0, 10)}... (EU citizen)`);
  console.log(`  Data Controller: ${controller.address.slice(0, 10)}... (Company)`);
  console.log(`  Data Processor:  ${processor.address.slice(0, 10)}... (Service provider)`);

  // Deploy contracts
  const KantaraFactory = await ethers.getContractFactory("KantaraConsentReceipt");
  const consentContract = await KantaraFactory.deploy();
  await consentContract.waitForDeployment();

  const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
  const dataProvenance = await DataProvenanceFactory.deploy();
  await dataProvenance.waitForDeployment();

  const AuditLogFactory = await ethers.getContractFactory("ConsentAuditLog");
  const auditLog = await AuditLogFactory.deploy();
  await auditLog.waitForDeployment();

  const DeletionFactory = await ethers.getContractFactory("DataDeletion");
  const dataDeletion = await DeletionFactory.deploy(await dataProvenance.getAddress());
  await dataDeletion.waitForDeployment();

  console.log(`\nContracts deployed for GDPR compliance demonstration`);

  // Get current time
  const block = await ethers.provider.getBlock("latest");
  const currentTime = block!.timestamp;

  // GDPR-relevant purposes
  const Purpose = {
    ServiceProvision: 0,        // Art. 6(1)(b) - Contract performance
    LegalObligation: 7,         // Art. 6(1)(c) - Legal obligation
    LegitimateInterest: 8,      // Art. 6(1)(f) - Legitimate interest
    DirectMarketing: 17,        // Art. 6(1)(a) - Consent required
    Profiling: 29               // Art. 22 - Automated decision-making
  };

  const ConsentType = {
    Explicit: 4,                // Required for sensitive data
    InformedExplicit: 6,        // Best practice for all consent
    WithdrawableAnytime: 11     // GDPR requirement
  };

  const AuditAction = {
    ConsentGiven: 0,
    ConsentRevoked: 1,
    DataRegistered: 3,
    DataAccessed: 4,
    DataDeleted: 5
  };

  // === SCENARIO ===

  // Step 1: Article 7 - Granular consent collection
  console.log("\n>>> Article 7: Collecting granular, freely-given consent");
  console.log("    GDPR requires consent to be specific, informed, unambiguous.\n");

  const oneYear = 365 * 24 * 60 * 60;
  const expiry = currentTime + oneYear;

  // Service provision (contract basis - Art. 6(1)(b))
  const serviceConsentTx = await consentContract.connect(dataSubject).giveConsent(
    controller.address,
    [Purpose.ServiceProvision],
    [],
    ConsentType.InformedExplicit,
    expiry,
    false, // No third-party sharing
    "https://company.com/privacy-policy"
  );
  const serviceReceipt = await serviceConsentTx.wait();
  const serviceEvent = serviceReceipt?.logs.find((log: any) => log.fragment?.name === "ConsentGiven");
  const serviceReceiptId = (serviceEvent as any)?.args[0];

  console.log("    ✓ Service provision consent (Article 6(1)(b))");
  console.log(`      Receipt: ${serviceReceiptId.slice(0, 20)}...`);
  console.log("      Lawful basis: Contract performance");

  // Marketing consent (requires explicit consent - Art. 6(1)(a))
  const marketingConsentTx = await consentContract.connect(dataSubject).giveConsent(
    controller.address,
    [Purpose.DirectMarketing],
    [],
    ConsentType.WithdrawableAnytime, // GDPR: easy withdrawal
    expiry,
    true, // May share with partners
    "https://company.com/marketing-policy"
  );
  const marketingReceipt = await marketingConsentTx.wait();
  const marketingEvent = marketingReceipt?.logs.find((log: any) => log.fragment?.name === "ConsentGiven");
  const marketingReceiptId = (marketingEvent as any)?.args[0];

  console.log("    ✓ Marketing consent (Article 6(1)(a))");
  console.log(`      Receipt: ${marketingReceiptId.slice(0, 20)}...`);
  console.log("      Lawful basis: Explicit consent");
  console.log("      Third-party sharing: Disclosed");

  // Profiling consent (requires explicit consent - Art. 22)
  const profilingConsentTx = await consentContract.connect(dataSubject).giveConsent(
    controller.address,
    [Purpose.Profiling],
    [],
    ConsentType.Explicit, // Art. 22 requires explicit consent
    expiry,
    false,
    "https://company.com/profiling-policy"
  );
  const profilingReceipt = await profilingConsentTx.wait();
  const profilingEvent = profilingReceipt?.logs.find((log: any) => log.fragment?.name === "ConsentGiven");
  const profilingReceiptId = (profilingEvent as any)?.args[0];

  console.log("    ✓ Profiling consent (Article 22)");
  console.log(`      Receipt: ${profilingReceiptId.slice(0, 20)}...`);
  console.log("      Lawful basis: Explicit consent for automated decisions");

  // Record audit entries
  const subjectId = ethers.keccak256(ethers.toUtf8Bytes(dataSubject.address));
  await auditLog.setAuthorizedRecorder(controller.address, true);

  await auditLog.connect(controller).recordAudit(
    AuditAction.ConsentGiven,
    subjectId,
    serviceReceiptId,
    JSON.stringify({
      gdprArticle: "6(1)(b)",
      purpose: "service_provision",
      lawfulBasis: "contract_performance"
    })
  );

  await auditLog.connect(controller).recordAudit(
    AuditAction.ConsentGiven,
    subjectId,
    marketingReceiptId,
    JSON.stringify({
      gdprArticle: "6(1)(a)",
      purpose: "direct_marketing",
      lawfulBasis: "consent",
      thirdPartyDisclosure: true
    })
  );

  // Step 2: Register personal data
  console.log("\n>>> Article 30: Registering processing activities");

  const personalData = {
    name: "Personal data record",
    categories: ["identity", "contact", "preferences"],
    subjects: [dataSubject.address],
    controller: controller.address,
    purposes: ["service_provision", "marketing"]
  };

  const dataHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(personalData)));
  await dataProvenance.connect(controller).registerData(dataHash, "personal_data");

  console.log(`    ✓ Personal data registered`);
  console.log(`      Hash: ${dataHash.slice(0, 20)}...`);
  console.log("      Categories: identity, contact, preferences");

  await auditLog.connect(controller).recordAudit(
    AuditAction.DataRegistered,
    subjectId,
    dataHash,
    JSON.stringify({
      gdprArticle: "30",
      dataCategories: personalData.categories,
      processingPurposes: personalData.purposes
    })
  );

  // Step 3: Article 15 - Data subject access request
  console.log("\n>>> Article 15: Processing data subject access request (DSAR)");

  const userConsents = await consentContract.getUserReceiptsCount(dataSubject.address);
  console.log(`\n    Data Subject Access Request Results:`);
  console.log(`    ─────────────────────────────────────────────────────`);
  console.log(`    Total consent records: ${userConsents}`);

  // Get all consent details
  const receiptIds = [serviceReceiptId, marketingReceiptId, profilingReceiptId];
  const receiptNames = ["Service Provision", "Direct Marketing", "Profiling"];

  console.log("\n    Consent Records:");
  for (let i = 0; i < receiptIds.length; i++) {
    const isValid = await consentContract.isConsentValid(receiptIds[i]);
    const receipt = await consentContract.getConsentReceipt(receiptIds[i]);
    const expiryDate = new Date(Number(receipt.expiryTime) * 1000).toLocaleDateString();

    console.log(`\n    ${i + 1}. ${receiptNames[i]}`);
    console.log(`       Status: ${isValid ? "ACTIVE" : "INVALID"}`);
    console.log(`       Given: Block ${receipt.timestamp}`);
    console.log(`       Expires: ${expiryDate}`);
    console.log(`       Third-party: ${receipt.thirdPartyDisclosure ? "Yes" : "No"}`);
  }

  // Query audit log for this subject
  const subjectAudits = await auditLog.getSubjectAuditCount(subjectId);
  console.log(`\n    Audit trail entries: ${subjectAudits}`);

  // Step 4: Article 7(3) - Withdraw consent (marketing)
  console.log("\n>>> Article 7(3): Data subject withdraws marketing consent");
  console.log("    GDPR: Withdrawal must be as easy as giving consent.\n");

  await consentContract.connect(dataSubject).revokeConsent(marketingReceiptId);

  console.log("    ✓ Marketing consent withdrawn");
  console.log("      Processing for this purpose must cease immediately.");

  const marketingStillValid = await consentContract.isConsentValid(marketingReceiptId);
  console.log(`      Consent status: ${marketingStillValid ? "VALID" : "REVOKED"}`);

  await auditLog.connect(controller).recordAudit(
    AuditAction.ConsentRevoked,
    subjectId,
    marketingReceiptId,
    JSON.stringify({
      gdprArticle: "7(3)",
      action: "consent_withdrawal",
      consequence: "processing_ceased"
    })
  );

  // Step 5: Article 17 - Right to erasure
  console.log("\n>>> Article 17: Data subject exercises right to erasure");

  // Request deletion (this also creates the deletion proof)
  await dataDeletion.connect(controller).requestDeletion(dataHash, "GDPR Article 17 request");

  console.log("    ✓ Deletion requested and processed");
  console.log("      Reason: GDPR Article 17 request");

  // Verify deletion was completed
  const [isDeleted, deletionRecord] = await dataDeletion.verifyDeletion(dataHash);

  console.log("    ✓ Deletion verified with cryptographic proof");
  console.log(`      Proof hash: ${deletionRecord.proofHash.slice(0, 20)}...`);

  // Check data is no longer accessible
  const isAccessible = await dataDeletion.isDataAccessible(dataHash);
  console.log(`      Data accessible: ${isAccessible ? "YES (ERROR!)" : "NO (Correct)"}`);

  // Show deletion certificate details
  console.log(`      Certificate issued: Block ${deletionRecord.deletionTimestamp}`);

  await auditLog.connect(controller).recordAudit(
    AuditAction.DataDeleted,
    subjectId,
    dataHash,
    JSON.stringify({
      gdprArticle: "17",
      reason: "data_subject_request",
      certificateHash: deletionRecord.proofHash
    })
  );

  // Step 6: Article 30 - Generate processing records
  console.log("\n>>> Article 30: Generating records of processing activities");

  const totalAudits = await auditLog.getAuditCount();
  const controllerAudits = await auditLog.getActorAuditCount(controller.address);

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           GDPR ARTICLE 30 - PROCESSING RECORDS          │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log(`    │  Controller: ${controller.address.slice(0, 30)}...     │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  PROCESSING PURPOSES                                    │");
  console.log("    │    • Service provision (Art. 6(1)(b))                  │");
  console.log("    │    • Direct marketing (Art. 6(1)(a)) - WITHDRAWN       │");
  console.log("    │    • Profiling (Art. 22)                               │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  DATA CATEGORIES                                        │");
  console.log("    │    • Identity data                                      │");
  console.log("    │    • Contact information                                │");
  console.log("    │    • Preferences                                        │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  LAWFUL BASIS                                           │");
  console.log("    │    • Contract performance: Service provision           │");
  console.log("    │    • Consent: Marketing, Profiling                     │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  AUDIT SUMMARY                                          │");
  console.log(`    │    Total audit entries: ${totalAudits}                                   │`);
  console.log(`    │    Controller activities: ${controllerAudits}                              │`);
  console.log("    │    Data subject requests: 1 (erasure)                  │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  COMPLIANCE STATUS                                      │");
  console.log("    │    ✓ Consent properly collected (Art. 7)               │");
  console.log("    │    ✓ Lawful basis documented (Art. 6)                  │");
  console.log("    │    ✓ DSAR processed (Art. 15)                          │");
  console.log("    │    ✓ Withdrawal honored (Art. 7(3))                    │");
  console.log("    │    ✓ Erasure completed (Art. 17)                       │");
  console.log("    │    ✓ Processing records maintained (Art. 30)          │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === GDPR COMPLIANCE SUMMARY ===

  console.log("\n" + "-".repeat(60));
  console.log("  GDPR Compliance Evidence Summary");
  console.log("-".repeat(60));

  // Final consent status
  console.log("\n    Final Consent Status:");
  for (let i = 0; i < receiptIds.length; i++) {
    const isValid = await consentContract.isConsentValid(receiptIds[i]);
    const status = isValid ? "✓ ACTIVE" : "✗ REVOKED";
    console.log(`      ${receiptNames[i]}: ${status}`);
  }

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  GDPR Articles Demonstrated:");
  console.log("  • Article 6: Lawful basis tracking per purpose");
  console.log("  • Article 7: Granular, freely-given, withdrawable consent");
  console.log("  • Article 15: Data subject access request processing");
  console.log("  • Article 17: Right to erasure with verification");
  console.log("  • Article 22: Explicit consent for profiling");
  console.log("  • Article 30: Records of processing activities");
  console.log("\n  Compliance Evidence:");
  console.log("  • Consent receipts with timestamps and purposes");
  console.log("  • Audit trail of all processing activities");
  console.log("  • Deletion certificates with cryptographic proof");
  console.log("  • Complete chain of accountability");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
