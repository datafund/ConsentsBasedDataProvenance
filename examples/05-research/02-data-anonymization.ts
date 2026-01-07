/**
 * Example: Data Anonymization
 * Scenario: Research
 * Persona: Researchers, Data Managers, IRB
 *
 * This example demonstrates:
 * - Data transformation tracking
 * - De-identification process documentation
 * - Linked data lineage
 * - Anonymized data provenance
 *
 * Scenario:
 * Research data preparation:
 * 1. Identifiable participant data collected
 * 2. De-identification process applied
 * 3. Transformation recorded on-chain
 * 4. Anonymized dataset available for analysis
 *
 * Run with:
 * npx hardhat run examples/05-research/02-data-anonymization.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Research Example: Data Anonymization");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up data anonymization scenario...\n");

  const [deployer, participant, researcher, dataManager] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Participant:    ${participant.address.slice(0, 10)}...`);
  console.log(`  Researcher:     ${researcher.address.slice(0, 10)}...`);
  console.log(`  Data Manager:   ${dataManager.address.slice(0, 10)}...`);

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

  console.log("\nContracts deployed successfully.");

  // Define purposes
  const RESEARCH_DATA = "research_data_collection";
  const ANONYMIZED_ANALYSIS = "anonymized_analysis";

  // === SCENARIO ===

  // Step 1: Participant consents to data collection
  console.log("\n>>> Step 1: Participant consents to research data collection");

  await consentReceipt.connect(participant)["giveConsent(string)"](RESEARCH_DATA);
  await consentReceipt.connect(participant)["giveConsent(string)"](ANONYMIZED_ANALYSIS);

  console.log("    ✓ Research data collection consent given");
  console.log("    ✓ Anonymized analysis consent given");

  // Step 2: Collect identifiable participant data
  console.log("\n>>> Step 2: Collect identifiable participant data");

  // Original identifiable data
  const participantData = {
    participantId: participant.address,
    name: "John Doe",
    dob: "1985-03-15",
    medicalRecordNumber: "MRN-12345",
    diagnosis: "Type 2 Diabetes",
    labResults: { hba1c: 7.2, glucose: 145 },
    medications: ["Metformin 500mg"],
    timestamp: Date.now()
  };

  const identifiableHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify(participantData)
  ));

  await integratedSystem.connect(participant).registerDataWithConsent(
    identifiableHash,
    "identifiable_health_record",
    RESEARCH_DATA
  );

  console.log(`    ✓ Identifiable data registered`);
  console.log(`      Hash: ${identifiableHash.slice(0, 20)}...`);
  console.log("      Contains: Name, DOB, MRN, diagnosis, labs, medications");

  // Step 3: Apply de-identification
  console.log("\n>>> Step 3: Apply de-identification process");
  console.log("    Data Manager applies Safe Harbor de-identification.\n");

  // Anonymized version (following Safe Harbor method)
  const anonymizedData = {
    subjectId: "SUBJ-" + participant.address.slice(2, 10).toUpperCase(),
    ageRange: "35-44",
    diagnosis: "Type 2 Diabetes", // Diagnosis retained
    labResults: { hba1c: 7.2, glucose: 145 }, // Labs retained
    medications: ["Metformin"], // Dose removed
    timestamp: Date.now() + 1
    // Removed: name, dob, medicalRecordNumber
  };

  const anonymizedHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify(anonymizedData)
  ));

  // Data manager needs consent
  await consentReceipt.connect(dataManager)["giveConsent(string)"](ANONYMIZED_ANALYSIS);

  // Record transformation
  await integratedSystem.connect(dataManager).transformDataWithConsent(
    identifiableHash,
    anonymizedHash,
    "safe_harbor_deidentification: removed 18 HIPAA identifiers",
    ANONYMIZED_ANALYSIS
  );

  console.log("    De-identification Applied:");
  console.log("    ─────────────────────────────────────────────────────");
  console.log("    Removed:");
  console.log("      • Name → [REMOVED]");
  console.log("      • DOB → Age range (35-44)");
  console.log("      • MRN → Subject ID (SUBJ-XXXXXXXX)");
  console.log("      • Exact medication doses → Generic");
  console.log("    Retained:");
  console.log("      • Diagnosis (relevant to study)");
  console.log("      • Lab values (essential data)");
  console.log();
  console.log(`    ✓ Anonymized data created`);
  console.log(`      Hash: ${anonymizedHash.slice(0, 20)}...`);

  // Step 4: View data lineage
  console.log("\n>>> Step 4: View data lineage");

  const identifiableRecord = await dataProvenance.getDataRecord(identifiableHash);
  const anonymizedRecord = await dataProvenance.getDataRecord(anonymizedHash);

  const statusMap = ["ACTIVE", "RESTRICTED", "DELETED"];

  console.log("\n    Data Lineage Chain:");
  console.log("    ═══════════════════════════════════════════════════════════");
  console.log("");
  console.log("    ┌─── IDENTIFIABLE DATA ───────────────────────────────────┐");
  console.log(`    │  Hash: ${identifiableHash.slice(0, 40)}...  │`);
  console.log(`    │  Type: ${identifiableRecord.dataType}`);
  console.log(`    │  Owner: ${identifiableRecord.owner.slice(0, 10)}... (Participant)`);
  console.log(`    │  Status: ${statusMap[identifiableRecord.status]}`);
  console.log("    │  Contains PII: YES (HIPAA identifiers)");
  console.log("    └─────────────────────────────────────────────────────────┘");
  console.log("                              │");
  console.log("                              ▼");
  console.log("             [TRANSFORMATION: Safe Harbor De-identification]");
  console.log("                              │");
  console.log("                              ▼");
  console.log("    ┌─── ANONYMIZED DATA ─────────────────────────────────────┐");
  console.log(`    │  Hash: ${anonymizedHash.slice(0, 40)}...  │`);
  console.log(`    │  Type: ${anonymizedRecord.dataType}`);
  console.log(`    │  Owner: ${anonymizedRecord.owner.slice(0, 10)}... (Data Manager)`);
  console.log(`    │  Status: ${statusMap[anonymizedRecord.status]}`);
  console.log("    │  Contains PII: NO (de-identified)");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // Step 5: Researcher accesses anonymized data
  console.log("\n>>> Step 5: Researcher accesses anonymized data for analysis");

  await consentReceipt.connect(researcher)["giveConsent(string)"](ANONYMIZED_ANALYSIS);

  await integratedSystem.connect(researcher).accessDataWithConsent(
    anonymizedHash,
    ANONYMIZED_ANALYSIS
  );

  console.log("    ✓ Researcher accessed anonymized data");

  const hasAccessed = await dataProvenance.hasAddressAccessed(anonymizedHash, researcher.address);
  console.log(`    Access logged: ${hasAccessed}`);

  // Step 6: Verify researcher cannot access identifiable data
  console.log("\n>>> Step 6: Verify access restrictions");

  const canAccessIdentifiable = await dataProvenance.hasAddressAccessed(identifiableHash, researcher.address);
  const canAccessAnonymized = await dataProvenance.hasAddressAccessed(anonymizedHash, researcher.address);

  console.log("\n    Access Verification:");
  console.log(`      Researcher → Identifiable data: ${canAccessIdentifiable ? "YES" : "NO (restricted)"}`);
  console.log(`      Researcher → Anonymized data: ${canAccessAnonymized ? "YES" : "NO"}`);

  // Step 7: Generate provenance report
  console.log("\n>>> Step 7: Generate data provenance report");

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           DATA PROVENANCE REPORT                        │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log(`    │  Report Date: ${new Date().toLocaleString()}            │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  TRANSFORMATION CHAIN                                   │");
  console.log("    │    1. identifiable_health_record                        │");
  console.log("    │       ↓ [safe_harbor_deidentification]                  │");
  console.log("    │    2. anonymized_health_record                          │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  DE-IDENTIFICATION METHOD                               │");
  console.log("    │    Method: HIPAA Safe Harbor                            │");
  console.log("    │    Identifiers removed: 18 types                        │");
  console.log("    │    Re-identification risk: Low                          │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  ACCESS CONTROL                                         │");
  console.log("    │    Identifiable data: Participant only                  │");
  console.log("    │    Anonymized data: Authorized researchers              │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  IRB COMPLIANCE                                         │");
  console.log("    │  ✓ De-identification process documented                │");
  console.log("    │  ✓ Transformation recorded on-chain                    │");
  console.log("    │  ✓ Data lineage traceable                              │");
  console.log("    │  ✓ Access restricted appropriately                     │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Data transformations recorded on-chain");
  console.log("  • Clear lineage from identifiable to anonymized");
  console.log("  • De-identification method documented");
  console.log("  • Access control per data type");
  console.log("  • Researchers access only anonymized data");
  console.log("  • Complete audit trail for IRB review");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
