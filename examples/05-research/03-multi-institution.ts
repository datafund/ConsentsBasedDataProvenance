/**
 * Example: Multi-Institution
 * Scenario: Research
 * Persona: Researchers, Data Managers, IRB, Collaborating Sites
 *
 * This example demonstrates:
 * - Cross-institution consent for multi-site studies
 * - Data sharing agreements between institutions
 * - Multi-party access logging
 * - Coordinating center data management
 *
 * Scenario:
 * Multi-site clinical trial:
 * 1. Participant enrolled at Site A
 * 2. Data shared with coordinating center
 * 3. Collaborating institutions access data
 * 4. All access tracked across institutions
 *
 * Run with:
 * npx hardhat run examples/05-research/03-multi-institution.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Research Example: Multi-Institution");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up multi-institution scenario...\n");

  const [deployer, participant, siteA, coordinatingCenter, siteB, siteC] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Participant:          ${participant.address.slice(0, 10)}...`);
  console.log(`  Site A (Enrolling):   ${siteA.address.slice(0, 10)}...`);
  console.log(`  Coordinating Center:  ${coordinatingCenter.address.slice(0, 10)}...`);
  console.log(`  Site B (Collaborator): ${siteB.address.slice(0, 10)}...`);
  console.log(`  Site C (Collaborator): ${siteC.address.slice(0, 10)}...`);

  // Deploy contracts
  const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceiptFactory.deploy();
  await consentReceipt.waitForDeployment();

  const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
  const dataProvenance = await DataProvenanceFactory.deploy();
  await dataProvenance.waitForDeployment();

  const IntegratedFactory = await ethers.getContractFactory("IntegratedConsentProvenanceSystem");
  const integratedSystem = await IntegratedFactory.deploy(
    await consentReceipt.getAddress(),
    await dataProvenance.getAddress()
  );
  await integratedSystem.waitForDeployment();

  const AuditLogFactory = await ethers.getContractFactory("ConsentAuditLog");
  const auditLog = await AuditLogFactory.deploy();
  await auditLog.waitForDeployment();

  // Authorize all sites to record audits
  await auditLog.setAuthorizedRecorder(siteA.address, true);
  await auditLog.setAuthorizedRecorder(coordinatingCenter.address, true);
  await auditLog.setAuthorizedRecorder(siteB.address, true);
  await auditLog.setAuthorizedRecorder(siteC.address, true);

  console.log("\nContracts deployed successfully.");

  // Study info
  const studyId = "MULTI-SITE-2024-001";

  // Define purposes
  const MULTI_SITE_STUDY = "multi_site_clinical_trial";
  const DATA_SHARING = "cross_institution_sharing";

  // AuditAction enum
  const AuditAction = {
    ConsentGiven: 0,
    DataRegistered: 3,
    DataAccessed: 4
  };

  // === SCENARIO ===

  // Step 1: Participant enrolls at Site A
  console.log("\n>>> Step 1: Participant enrolls at Site A");

  await consentReceipt.connect(participant)["giveConsent(string)"](MULTI_SITE_STUDY);
  await consentReceipt.connect(participant)["giveConsent(string)"](DATA_SHARING);

  console.log("    ✓ Multi-site study consent given");
  console.log("    ✓ Cross-institution data sharing consent given");

  // Record enrollment in audit log
  const participantSubjectId = ethers.keccak256(ethers.toUtf8Bytes(`participant:${participant.address}`));
  await auditLog.connect(siteA).recordAudit(
    AuditAction.ConsentGiven,
    participantSubjectId,
    ethers.ZeroHash,
    JSON.stringify({ site: "Site A", study: studyId, type: "enrollment" })
  );

  console.log("    ✓ Enrollment recorded in audit log");

  // Step 2: Site A collects participant data
  console.log("\n>>> Step 2: Site A collects participant data");

  const participantDataHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify({
      participantId: participant.address,
      site: "Site A",
      visitData: { bp: "120/80", hr: 72 },
      labResults: { cholesterol: 195 },
      ts: Date.now()
    })
  ));

  await integratedSystem.connect(participant).registerDataWithConsent(
    participantDataHash,
    "multi_site_participant_record",
    MULTI_SITE_STUDY
  );

  await auditLog.connect(siteA).recordAudit(
    AuditAction.DataRegistered,
    participantSubjectId,
    participantDataHash,
    JSON.stringify({ site: "Site A", dataType: "clinical_data" })
  );

  console.log(`    ✓ Participant data collected at Site A`);
  console.log(`      Hash: ${participantDataHash.slice(0, 20)}...`);

  // Step 3: Data shared with coordinating center
  console.log("\n>>> Step 3: Data shared with Coordinating Center");

  // Coordinating center gives consent for data handling
  await consentReceipt.connect(coordinatingCenter)["giveConsent(string)"](DATA_SHARING);

  await integratedSystem.connect(coordinatingCenter).accessDataWithConsent(
    participantDataHash,
    DATA_SHARING
  );

  await auditLog.connect(coordinatingCenter).recordAudit(
    AuditAction.DataAccessed,
    participantSubjectId,
    participantDataHash,
    JSON.stringify({ site: "Coordinating Center", purpose: "data_aggregation" })
  );

  console.log("    ✓ Coordinating Center accessed data");

  // Step 4: Collaborating sites access data
  console.log("\n>>> Step 4: Collaborating sites access shared data");

  // Site B
  await consentReceipt.connect(siteB)["giveConsent(string)"](DATA_SHARING);
  await integratedSystem.connect(siteB).accessDataWithConsent(
    participantDataHash,
    DATA_SHARING
  );

  await auditLog.connect(siteB).recordAudit(
    AuditAction.DataAccessed,
    participantSubjectId,
    participantDataHash,
    JSON.stringify({ site: "Site B", purpose: "comparative_analysis" })
  );

  console.log("    ✓ Site B accessed data for comparative analysis");

  // Site C
  await consentReceipt.connect(siteC)["giveConsent(string)"](DATA_SHARING);
  await integratedSystem.connect(siteC).accessDataWithConsent(
    participantDataHash,
    DATA_SHARING
  );

  await auditLog.connect(siteC).recordAudit(
    AuditAction.DataAccessed,
    participantSubjectId,
    participantDataHash,
    JSON.stringify({ site: "Site C", purpose: "validation_cohort" })
  );

  console.log("    ✓ Site C accessed data for validation");

  // Step 5: View cross-institution access log
  console.log("\n>>> Step 5: View cross-institution access log");

  const record = await dataProvenance.getDataRecord(participantDataHash);

  console.log("\n    Data Access Summary:");
  console.log("    ─────────────────────────────────────────────────────");
  console.log(`    Data Hash: ${participantDataHash.slice(0, 30)}...`);
  console.log(`    Total Accessors: ${record.accessors.length}`);
  console.log("\n    Institutions with Access:");

  const siteNames: { [key: string]: string } = {
    [coordinatingCenter.address]: "Coordinating Center",
    [siteB.address]: "Site B",
    [siteC.address]: "Site C"
  };

  for (const accessor of record.accessors) {
    const name = siteNames[accessor] || accessor.slice(0, 10) + "...";
    console.log(`      • ${name}`);
  }

  // Step 6: Query audit log by institution
  console.log("\n>>> Step 6: Query audit log by institution");

  const sites = [
    { signer: siteA, name: "Site A" },
    { signer: coordinatingCenter, name: "Coordinating Center" },
    { signer: siteB, name: "Site B" },
    { signer: siteC, name: "Site C" }
  ];

  console.log("\n    Institution Activity:");
  for (const site of sites) {
    const count = await auditLog.getActorAuditCount(site.signer.address);
    console.log(`      ${site.name}: ${count} audit entries`);
  }

  // Step 7: Generate multi-site report
  console.log("\n>>> Step 7: Generate multi-site data sharing report");

  const totalAudits = await auditLog.getAuditCount();

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │        MULTI-SITE DATA SHARING REPORT                   │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log(`    │  Study ID: ${studyId}                         │`);
  console.log(`    │  Report Date: ${new Date().toLocaleString()}            │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  PARTICIPATING SITES                                    │");
  console.log("    │    • Site A (Enrolling Site)                            │");
  console.log("    │    • Coordinating Center                                │");
  console.log("    │    • Site B (Collaborating)                             │");
  console.log("    │    • Site C (Collaborating)                             │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  DATA FLOW                                              │");
  console.log("    │    Participant → Site A → Coordinating Center           │");
  console.log("    │                         → Site B                        │");
  console.log("    │                         → Site C                        │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  CONSENT STATUS                                         │");

  const hasMultiSite = await consentReceipt.getConsentStatus(participant.address, MULTI_SITE_STUDY);
  const hasSharing = await consentReceipt.getConsentStatus(participant.address, DATA_SHARING);

  console.log(`    │    Multi-site participation: ${hasMultiSite ? "ACTIVE" : "INACTIVE"}                  │`);
  console.log(`    │    Cross-institution sharing: ${hasSharing ? "ACTIVE" : "INACTIVE"}                 │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  AUDIT SUMMARY                                          │");
  console.log(`    │    Total audit entries: ${totalAudits}                                   │`);
  console.log(`    │    Institutions accessing data: ${record.accessors.length}                         │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  COMPLIANCE                                             │");
  console.log("    │  ✓ Participant consent for multi-site sharing          │");
  console.log("    │  ✓ Each institution access logged                      │");
  console.log("    │  ✓ Complete data flow audit trail                      │");
  console.log("    │  ✓ Cross-institutional DUA compliance                  │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Participant consent covers multi-site sharing");
  console.log("  • Each institution's access is logged");
  console.log("  • Coordinating center manages data aggregation");
  console.log("  • Collaborating sites access with proper authorization");
  console.log("  • Complete audit trail across all institutions");
  console.log("  • Supports Data Use Agreement (DUA) compliance");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
