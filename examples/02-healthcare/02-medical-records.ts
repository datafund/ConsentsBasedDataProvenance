/**
 * Example: Medical Records
 * Scenario: Healthcare
 * Persona: Developers, Healthcare IT, Compliance Officers
 *
 * This example demonstrates:
 * - Registering medical data with consent verification
 * - Data provenance tracking for medical records
 * - Multiple providers contributing to patient record
 *
 * Scenario:
 * A patient visit generates multiple data records:
 * 1. Patient gives treatment consent
 * 2. Doctor registers diagnosis data
 * 3. Lab registers test results
 * 4. Specialist adds consultation notes
 * All data is linked with full provenance tracking.
 *
 * Run with:
 * npx hardhat run examples/02-healthcare/02-medical-records.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Healthcare Example: Medical Records");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up healthcare data scenario...\n");

  const [deployer, patient, doctor, labTech, specialist] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Patient (Alice):    ${patient.address.slice(0, 10)}...`);
  console.log(`  Primary Doctor:     ${doctor.address.slice(0, 10)}...`);
  console.log(`  Lab Technician:     ${labTech.address.slice(0, 10)}...`);
  console.log(`  Specialist:         ${specialist.address.slice(0, 10)}...`);

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

  // Define constants
  const TREATMENT_PURPOSE = "medical_treatment";

  // Helper to create data hashes
  const createRecordHash = (patientId: string, recordType: string, visitId: string) => {
    return ethers.keccak256(ethers.toUtf8Bytes(
      JSON.stringify({ patientId, recordType, visitId, timestamp: Date.now() })
    ));
  };

  // === SCENARIO ===

  // Step 1: Patient gives consent for treatment
  console.log("\n>>> Step 1: Patient gives consent for treatment");
  await consentReceipt.connect(patient)["giveConsent(string)"](TREATMENT_PURPOSE);
  console.log("    ✓ Treatment consent recorded");

  // Step 2: Verify consent before proceeding
  console.log("\n>>> Step 2: Hospital verifies patient consent");
  const hasConsent = await consentReceipt.getConsentStatus(patient.address, TREATMENT_PURPOSE);
  console.log(`    Consent for '${TREATMENT_PURPOSE}': ${hasConsent ? "VERIFIED" : "NOT FOUND"}`);

  if (!hasConsent) {
    console.log("    ✗ Cannot proceed without consent!");
    return;
  }

  // Step 3: Doctor registers initial diagnosis
  console.log("\n>>> Step 3: Doctor registers diagnosis data");

  const diagnosisHash = createRecordHash("PATIENT-001", "diagnosis", "VISIT-2024-001");

  // Patient registers their own data with consent (in real world, hospital system would act on behalf)
  await integratedSystem.connect(patient).registerDataWithConsent(
    diagnosisHash,
    "diagnosis_report",
    TREATMENT_PURPOSE
  );

  console.log("    ✓ Diagnosis data registered");
  console.log(`      Hash: ${diagnosisHash.slice(0, 20)}...`);
  console.log("      Type: diagnosis_report");

  // Step 4: Lab adds test results
  console.log("\n>>> Step 4: Lab registers test results");

  const labResultsHash = createRecordHash("PATIENT-001", "lab_results", "VISIT-2024-001");

  await integratedSystem.connect(patient).registerDataWithConsent(
    labResultsHash,
    "laboratory_results",
    TREATMENT_PURPOSE
  );

  console.log("    ✓ Lab results registered");
  console.log(`      Hash: ${labResultsHash.slice(0, 20)}...`);
  console.log("      Type: laboratory_results");

  // Step 5: Specialist adds consultation notes
  console.log("\n>>> Step 5: Specialist adds consultation notes");

  const consultationHash = createRecordHash("PATIENT-001", "consultation", "VISIT-2024-001");

  await integratedSystem.connect(patient).registerDataWithConsent(
    consultationHash,
    "specialist_consultation",
    TREATMENT_PURPOSE
  );

  console.log("    ✓ Consultation notes registered");
  console.log(`      Hash: ${consultationHash.slice(0, 20)}...`);
  console.log("      Type: specialist_consultation");

  // Step 6: View all patient data records
  console.log("\n>>> Step 6: View patient's data provenance");

  const patientData = await integratedSystem.getUserRegisteredData(patient.address);
  console.log(`\n    Patient has ${patientData.length} data records:\n`);

  for (const dataHash of patientData) {
    const record = await dataProvenance.getDataRecord(dataHash);
    const statusMap = ["ACTIVE", "RESTRICTED", "DELETED"];

    console.log(`    Record: ${dataHash.slice(0, 20)}...`);
    console.log(`      Type: ${record.dataType}`);
    console.log(`      Status: ${statusMap[record.status]}`);
    console.log(`      Registered: ${new Date(Number(record.timestamp) * 1000).toLocaleString()}`);

    // Check consent purpose
    const consentPurpose = await integratedSystem.getDataConsentPurpose(dataHash);
    console.log(`      Consent Purpose: ${consentPurpose}`);
    console.log();
  }

  // Step 7: Verify data provenance for audit
  console.log(">>> Step 7: Verify data provenance for HIPAA audit");

  console.log("\n    Audit Trail Summary:");
  console.log("    ─────────────────────────────────────");

  for (const dataHash of patientData) {
    const record = await dataProvenance.getDataRecord(dataHash);
    const consentPurpose = await integratedSystem.getDataConsentPurpose(dataHash);
    const hasValidConsent = await consentReceipt.getConsentStatus(patient.address, consentPurpose);

    console.log(`    ${record.dataType}:`);
    console.log(`      • Data exists: ✓`);
    console.log(`      • Consent verified at registration: ✓`);
    console.log(`      • Current consent status: ${hasValidConsent ? "Valid" : "Revoked"}`);
    console.log(`      • Owner: ${record.owner.slice(0, 10)}...`);
  }

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • All data registration requires valid consent");
  console.log("  • Each record tracks owner, timestamp, and consent purpose");
  console.log("  • Data provenance enables HIPAA disclosure accounting");
  console.log("  • Multiple providers can contribute to patient record");
  console.log("  • Audit trail available for compliance verification");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
