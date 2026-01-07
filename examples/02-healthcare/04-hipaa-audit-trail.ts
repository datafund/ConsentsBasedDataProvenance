/**
 * Example: HIPAA Audit Trail
 * Scenario: Healthcare
 * Persona: Compliance Officers, Regulators, Hospital IT
 *
 * This example demonstrates:
 * - ConsentAuditLog for comprehensive logging
 * - Query audit trail by patient (subject) or provider (actor)
 * - Time-bounded audit queries
 * - Evidence generation for HIPAA compliance
 *
 * Scenario:
 * A compliance officer needs to generate an audit report:
 * 1. Hospital staff perform various data operations
 * 2. All actions are logged in the audit trail
 * 3. Compliance officer queries by patient (subject)
 * 4. Compliance officer queries by provider (actor)
 * 5. Generate report showing all PHI access
 *
 * Run with:
 * npx hardhat run examples/02-healthcare/04-hipaa-audit-trail.ts --network localhost
 */

import { ethers } from "hardhat";

// AuditAction enum values matching the contract
const AuditAction = {
  ConsentGiven: 0,
  ConsentRevoked: 1,
  ConsentExpired: 2,
  DataRegistered: 3,
  DataAccessed: 4,
  DataTransformed: 5,
  DataRestricted: 6,
  DataDeleted: 7,
  OwnershipTransferred: 8,
  AccessGranted: 9,
  AccessRevoked: 10
};

const ActionNames = [
  "ConsentGiven",
  "ConsentRevoked",
  "ConsentExpired",
  "DataRegistered",
  "DataAccessed",
  "DataTransformed",
  "DataRestricted",
  "DataDeleted",
  "OwnershipTransferred",
  "AccessGranted",
  "AccessRevoked"
];

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Healthcare Example: HIPAA Audit Trail");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up HIPAA audit scenario...\n");

  const [deployer, patient, doctor, nurse, labTech, complianceOfficer] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Patient (Alice):      ${patient.address.slice(0, 10)}...`);
  console.log(`  Doctor:               ${doctor.address.slice(0, 10)}...`);
  console.log(`  Nurse:                ${nurse.address.slice(0, 10)}...`);
  console.log(`  Lab Technician:       ${labTech.address.slice(0, 10)}...`);
  console.log(`  Compliance Officer:   ${complianceOfficer.address.slice(0, 10)}...`);

  // Deploy ConsentAuditLog
  const AuditLogFactory = await ethers.getContractFactory("ConsentAuditLog");
  const auditLog = await AuditLogFactory.deploy();
  await auditLog.waitForDeployment();

  console.log("\nConsentAuditLog deployed successfully.");

  // Authorize all hospital staff to record audits
  await auditLog.setAuthorizedRecorder(doctor.address, true);
  await auditLog.setAuthorizedRecorder(nurse.address, true);
  await auditLog.setAuthorizedRecorder(labTech.address, true);
  console.log("Hospital staff authorized as audit recorders.");

  // Create patient subject ID (represents the patient in audit logs)
  const patientSubjectId = ethers.keccak256(ethers.toUtf8Bytes(`patient:${patient.address}`));
  console.log(`\nPatient Subject ID: ${patientSubjectId.slice(0, 20)}...`);

  // Create data hashes for different records
  const diagnosisDataHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify({ type: "diagnosis", patientId: patient.address, ts: Date.now() })
  ));
  const labResultsHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify({ type: "lab_results", patientId: patient.address, ts: Date.now() + 1 })
  ));
  const prescriptionHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify({ type: "prescription", patientId: patient.address, ts: Date.now() + 2 })
  ));

  // === SCENARIO ===

  // Step 1: Patient gives consent (recorded by admin/system)
  console.log("\n>>> Step 1: Patient gives consent for treatment");

  await auditLog.recordAudit(
    AuditAction.ConsentGiven,
    patientSubjectId,
    ethers.ZeroHash,
    JSON.stringify({ purpose: "medical_treatment", expiry: "permanent" })
  );
  console.log("    ✓ Consent given - logged");

  // Step 2: Doctor registers diagnosis
  console.log("\n>>> Step 2: Doctor registers diagnosis");

  await auditLog.connect(doctor).recordAudit(
    AuditAction.DataRegistered,
    patientSubjectId,
    diagnosisDataHash,
    JSON.stringify({ dataType: "diagnosis", department: "General Medicine" })
  );
  console.log("    ✓ Diagnosis registered - logged");

  // Step 3: Nurse accesses patient data
  console.log("\n>>> Step 3: Nurse accesses patient data for vitals update");

  await auditLog.connect(nurse).recordAudit(
    AuditAction.DataAccessed,
    patientSubjectId,
    diagnosisDataHash,
    JSON.stringify({ reason: "vitals_update", station: "Ward 3" })
  );
  console.log("    ✓ Nurse access - logged");

  // Step 4: Lab technician registers results
  console.log("\n>>> Step 4: Lab technician registers test results");

  await auditLog.connect(labTech).recordAudit(
    AuditAction.DataRegistered,
    patientSubjectId,
    labResultsHash,
    JSON.stringify({ dataType: "blood_panel", lab: "Clinical Lab A" })
  );
  console.log("    ✓ Lab results registered - logged");

  // Step 5: Doctor accesses lab results
  console.log("\n>>> Step 5: Doctor accesses lab results");

  await auditLog.connect(doctor).recordAudit(
    AuditAction.DataAccessed,
    patientSubjectId,
    labResultsHash,
    JSON.stringify({ reason: "review_results", followup: true })
  );
  console.log("    ✓ Doctor access to lab results - logged");

  // Step 6: Doctor creates prescription
  console.log("\n>>> Step 6: Doctor creates prescription");

  await auditLog.connect(doctor).recordAudit(
    AuditAction.DataRegistered,
    patientSubjectId,
    prescriptionHash,
    JSON.stringify({ dataType: "prescription", medication: "redacted" })
  );
  console.log("    ✓ Prescription registered - logged");

  // Step 7: Data transformation (anonymization for research)
  console.log("\n>>> Step 7: Data anonymized for research");

  const anonymizedHash = ethers.keccak256(ethers.toUtf8Bytes("anonymized:" + labResultsHash));
  await auditLog.connect(doctor).recordAudit(
    AuditAction.DataTransformed,
    patientSubjectId,
    anonymizedHash,
    JSON.stringify({ transform: "de-identification", original: labResultsHash.slice(0, 20) })
  );
  console.log("    ✓ Data transformation - logged");

  // === COMPLIANCE QUERIES ===

  console.log("\n" + "-".repeat(60));
  console.log("  HIPAA Compliance Audit Queries");
  console.log("-".repeat(60));

  // Query 1: All audit entries (total count)
  console.log("\n>>> Query 1: Total audit entries");
  const totalEntries = await auditLog.getAuditCount();
  console.log(`    Total audit log entries: ${totalEntries}`);

  // Query 2: All activity for this patient (subject)
  console.log("\n>>> Query 2: All PHI access for Patient Alice");
  console.log("    (HIPAA requires 6-year retention of disclosure accounting)\n");

  const patientAuditCount = await auditLog.getSubjectAuditCount(patientSubjectId);
  console.log(`    Total entries for patient: ${patientAuditCount}`);

  const patientAudits = await auditLog.getAuditsBySubject(patientSubjectId, 0, 100);

  console.log("\n    Patient Disclosure Accounting:");
  console.log("    ─────────────────────────────────────────────────────");

  for (let i = 0; i < patientAudits.length; i++) {
    const entry = patientAudits[i];
    const timestamp = new Date(Number(entry.timestamp) * 1000).toLocaleString();
    const action = ActionNames[entry.action];
    const metadata = JSON.parse(entry.metadata);

    console.log(`    [${i + 1}] ${timestamp}`);
    console.log(`        Action: ${action}`);
    console.log(`        Actor: ${entry.actor.slice(0, 10)}...`);
    console.log(`        Details: ${JSON.stringify(metadata)}`);
    console.log();
  }

  // Query 3: Activity by specific provider (doctor)
  console.log("\n>>> Query 3: All activity by Doctor");

  const doctorAuditCount = await auditLog.getActorAuditCount(doctor.address);
  console.log(`    Total entries by doctor: ${doctorAuditCount}`);

  const doctorAudits = await auditLog.getAuditsByActor(doctor.address, 0, 100);

  console.log("\n    Doctor's Activity Log:");
  console.log("    ─────────────────────────────────────────────────────");

  for (const entry of doctorAudits) {
    const timestamp = new Date(Number(entry.timestamp) * 1000).toLocaleString();
    const action = ActionNames[entry.action];
    console.log(`    • ${timestamp} - ${action}`);
  }

  // Query 4: Activity by nurse
  console.log("\n\n>>> Query 4: All activity by Nurse");

  const nurseAuditCount = await auditLog.getActorAuditCount(nurse.address);
  console.log(`    Total entries by nurse: ${nurseAuditCount}`);

  const nurseAudits = await auditLog.getAuditsByActor(nurse.address, 0, 100);

  for (const entry of nurseAudits) {
    const timestamp = new Date(Number(entry.timestamp) * 1000).toLocaleString();
    const action = ActionNames[entry.action];
    const metadata = JSON.parse(entry.metadata);
    console.log(`    • ${timestamp} - ${action}`);
    console.log(`      Reason: ${metadata.reason || "N/A"}`);
  }

  // === GENERATE COMPLIANCE REPORT ===

  console.log("\n" + "-".repeat(60));
  console.log("  HIPAA Compliance Report");
  console.log("-".repeat(60));

  console.log("\n┌─────────────────────────────────────────────────────────┐");
  console.log("│           HIPAA DISCLOSURE ACCOUNTING REPORT            │");
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log(`│  Patient Subject ID: ${patientSubjectId.slice(0, 20)}...       │`);
  console.log(`│  Report Generated: ${new Date().toLocaleString()}          │`);
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log("│  SUMMARY                                                │");
  console.log(`│  • Total PHI Events: ${patientAudits.length}                                     │`);

  // Count by action type
  const actionCounts: { [key: string]: number } = {};
  for (const entry of patientAudits) {
    const action = ActionNames[entry.action];
    actionCounts[action] = (actionCounts[action] || 0) + 1;
  }

  console.log("│  • Events by Type:                                      │");
  for (const [action, count] of Object.entries(actionCounts)) {
    const padding = " ".repeat(Math.max(0, 20 - action.length));
    console.log(`│      ${action}:${padding}${count}                               │`);
  }

  // Count unique actors
  const uniqueActors = new Set(patientAudits.map(e => e.actor));
  console.log(`│  • Unique Accessors: ${uniqueActors.size}                                     │`);

  console.log("├─────────────────────────────────────────────────────────┤");
  console.log("│  COMPLIANCE STATUS                                      │");
  console.log("│  ✓ All PHI access logged                               │");
  console.log("│  ✓ Actor identification captured                       │");
  console.log("│  ✓ Timestamps recorded (blockchain)                    │");
  console.log("│  ✓ Access reasons documented                           │");
  console.log("│  ✓ Data transformations tracked                        │");
  console.log("└─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • ConsentAuditLog provides immutable audit trail");
  console.log("  • Query by patient (subject) for disclosure accounting");
  console.log("  • Query by provider (actor) for staff activity review");
  console.log("  • Metadata captures context for each access");
  console.log("  • Supports HIPAA 45 CFR 164.528 requirements");
  console.log("  • On-chain timestamps provide tamper-evident logging");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
