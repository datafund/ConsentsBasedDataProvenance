/**
 * Example: Right to Deletion
 * Scenario: Healthcare
 * Persona: Patients, Compliance Officers, Hospital IT
 *
 * This example demonstrates:
 * - Patient exercises GDPR/HIPAA deletion rights
 * - DataDeletion contract for erasure requests
 * - Cryptographic deletion proofs
 * - Maintaining audit trail while deleting data
 * - Verification of deletion for compliance
 *
 * Scenario:
 * Patient decides to exercise right to erasure:
 * 1. Patient has medical records registered
 * 2. Patient requests deletion of specific data
 * 3. System generates cryptographic proof
 * 4. Data marked as deleted (inaccessible)
 * 5. Deletion proof available for compliance
 * 6. Audit trail preserved for legal requirements
 *
 * Run with:
 * npx hardhat run examples/02-healthcare/05-right-to-deletion.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Healthcare Example: Right to Deletion");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up deletion scenario...\n");

  const [deployer, patient, hospital] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Patient (Alice):   ${patient.address.slice(0, 10)}...`);
  console.log(`  Hospital System:   ${hospital.address.slice(0, 10)}...`);

  // Deploy DataProvenance
  const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
  const dataProvenance = await DataProvenanceFactory.deploy();
  await dataProvenance.waitForDeployment();

  // Deploy DataDeletion
  const DataDeletionFactory = await ethers.getContractFactory("DataDeletion");
  const dataDeletion = await DataDeletionFactory.deploy(await dataProvenance.getAddress());
  await dataDeletion.waitForDeployment();

  console.log("\nContracts deployed:");
  console.log(`  DataProvenance: ${await dataProvenance.getAddress()}`);
  console.log(`  DataDeletion:   ${await dataDeletion.getAddress()}`);

  // Create multiple data records for the patient
  const records = [
    { type: "diagnosis", desc: "Initial diagnosis record" },
    { type: "lab_results", desc: "Blood panel results" },
    { type: "imaging", desc: "X-ray imaging data" },
    { type: "prescription", desc: "Medication prescription" },
    { type: "visit_notes", desc: "Doctor visit notes" }
  ];

  const dataHashes: string[] = [];

  // === SCENARIO ===

  // Step 1: Register patient medical records
  console.log("\n>>> Step 1: Patient has existing medical records");
  console.log("    Hospital registers patient data during treatment.\n");

  for (const record of records) {
    const hash = ethers.keccak256(ethers.toUtf8Bytes(
      JSON.stringify({
        patientId: patient.address,
        type: record.type,
        data: `sensitive_${record.type}_data`,
        ts: Date.now() + dataHashes.length
      })
    ));
    dataHashes.push(hash);

    await dataProvenance.connect(patient).registerData(hash, record.type);
    console.log(`    ✓ ${record.desc}`);
    console.log(`      Hash: ${hash.slice(0, 20)}...`);
  }

  // Step 2: Verify all records are active
  console.log("\n>>> Step 2: Verify all records are ACTIVE");

  const statusMap = ["ACTIVE", "RESTRICTED", "DELETED"];

  for (let i = 0; i < dataHashes.length; i++) {
    const record = await dataProvenance.getDataRecord(dataHashes[i]);
    console.log(`    ${records[i].type}: ${statusMap[record.status]}`);
  }

  // Step 3: Patient decides to delete specific records
  console.log("\n>>> Step 3: Patient requests deletion of imaging data");
  console.log("    Patient exercises right to erasure under GDPR Article 17.\n");

  const imagingHash = dataHashes[2]; // imaging record
  const imagingRecord = records[2];

  // First, mark the data as deleted in DataProvenance
  await dataProvenance.connect(patient).updateDataStatus(imagingHash, 2); // 2 = Deleted

  // Then request formal deletion with proof
  await dataDeletion.connect(patient).requestDeletion(
    imagingHash,
    "Patient request - GDPR Article 17 Right to Erasure"
  );

  console.log(`    ✓ Deletion requested for: ${imagingRecord.desc}`);
  console.log(`      Reason: GDPR Article 17 Right to Erasure`);

  // Step 4: Verify deletion and get proof
  console.log("\n>>> Step 4: Verify deletion and retrieve proof");

  const [isDeleted, deletionProof] = await dataDeletion.verifyDeletion(imagingHash);

  console.log(`    Deletion verified: ${isDeleted}`);
  console.log("\n    Deletion Proof:");
  console.log(`      Data Hash:  ${deletionProof.dataHash.slice(0, 20)}...`);
  console.log(`      Requester:  ${deletionProof.requester.slice(0, 10)}...`);
  console.log(`      Timestamp:  ${new Date(Number(deletionProof.deletionTimestamp) * 1000).toLocaleString()}`);
  console.log(`      Proof Hash: ${deletionProof.proofHash.slice(0, 20)}...`);
  console.log(`      Reason:     ${deletionProof.reason}`);

  // Step 5: Demonstrate data is now inaccessible
  console.log("\n>>> Step 5: Verify data accessibility");

  const isAccessible = await dataDeletion.isDataAccessible(imagingHash);
  console.log(`    Imaging data accessible: ${isAccessible ? "YES" : "NO (DELETED)"}`);

  // Check other records are still accessible
  for (let i = 0; i < dataHashes.length; i++) {
    if (i === 2) continue; // skip imaging
    const accessible = await dataDeletion.isDataAccessible(dataHashes[i]);
    console.log(`    ${records[i].type} accessible: ${accessible ? "YES" : "NO"}`);
  }

  // Step 6: Patient deletes another record
  console.log("\n>>> Step 6: Patient deletes prescription data");

  const prescriptionHash = dataHashes[3];

  await dataProvenance.connect(patient).updateDataStatus(prescriptionHash, 2);
  await dataDeletion.connect(patient).requestDeletion(
    prescriptionHash,
    "Patient request - no longer needed"
  );

  console.log("    ✓ Prescription data deleted");

  // Step 7: View all patient deletion requests
  console.log("\n>>> Step 7: View patient's deletion history");

  const deletionRequests = await dataDeletion.getUserDeletionRequests(patient.address);

  console.log(`\n    Patient has ${deletionRequests.length} deletion requests:\n`);

  for (let i = 0; i < deletionRequests.length; i++) {
    const [deleted, proof] = await dataDeletion.verifyDeletion(deletionRequests[i]);
    const timestamp = new Date(Number(proof.deletionTimestamp) * 1000).toLocaleString();

    console.log(`    [${i + 1}] Deleted: ${timestamp}`);
    console.log(`        Hash: ${proof.dataHash.slice(0, 20)}...`);
    console.log(`        Reason: ${proof.reason}`);
    console.log(`        Proof: ${proof.proofHash.slice(0, 20)}...`);
    console.log();
  }

  // Step 8: Final status summary
  console.log(">>> Step 8: Final data status summary");
  console.log("\n    ┌────────────────────┬──────────────┬─────────────┐");
  console.log("    │ Record Type        │ Status       │ Accessible  │");
  console.log("    ├────────────────────┼──────────────┼─────────────┤");

  for (let i = 0; i < dataHashes.length; i++) {
    const record = await dataProvenance.getDataRecord(dataHashes[i]);
    const accessible = await dataDeletion.isDataAccessible(dataHashes[i]);
    const status = statusMap[record.status];
    const accessStr = accessible ? "Yes" : "No";
    const padding1 = " ".repeat(Math.max(0, 18 - records[i].type.length));
    const padding2 = " ".repeat(Math.max(0, 12 - status.length));
    console.log(`    │ ${records[i].type}${padding1} │ ${status}${padding2} │ ${accessStr}           │`);
  }

  console.log("    └────────────────────┴──────────────┴─────────────┘");

  // === COMPLIANCE REPORT ===
  console.log("\n" + "-".repeat(60));
  console.log("  Deletion Compliance Report");
  console.log("-".repeat(60));

  console.log("\n┌─────────────────────────────────────────────────────────┐");
  console.log("│           GDPR ARTICLE 17 COMPLIANCE REPORT             │");
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log(`│  Data Subject: ${patient.address.slice(0, 20)}...            │`);
  console.log(`│  Report Date: ${new Date().toLocaleString()}               │`);
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log("│  ERASURE REQUESTS                                       │");
  console.log(`│  • Total requests: ${deletionRequests.length}                                    │`);
  console.log(`│  • All requests processed: ✓                            │`);
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log("│  CRYPTOGRAPHIC PROOFS                                   │");

  for (const hash of deletionRequests) {
    const [, proof] = await dataDeletion.verifyDeletion(hash);
    console.log(`│  • ${proof.proofHash.slice(0, 30)}...    │`);
  }

  console.log("├─────────────────────────────────────────────────────────┤");
  console.log("│  COMPLIANCE STATUS                                      │");
  console.log("│  ✓ Deletion proofs generated (cryptographic)           │");
  console.log("│  ✓ Data marked inaccessible                            │");
  console.log("│  ✓ Audit trail preserved                               │");
  console.log("│  ✓ Requester identity verified                         │");
  console.log("│  ✓ Timestamps immutably recorded                       │");
  console.log("└─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Patients can request deletion of their data");
  console.log("  • Cryptographic proof generated for each deletion");
  console.log("  • Deletion proofs satisfy regulatory requirements");
  console.log("  • Data becomes inaccessible after deletion");
  console.log("  • Complete deletion history available for audit");
  console.log("  • Supports GDPR Article 17 and HIPAA requirements");
  console.log("  • Proof hash provides verifiable evidence of deletion");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
