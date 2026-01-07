/**
 * Example: Breach Investigation
 * Scenario: Compliance & Audit
 * Persona: Security Teams, DPOs, Legal Counsel
 *
 * This example demonstrates:
 * - Forensic analysis of data access
 * - Affected data identification
 * - Access timeline reconstruction
 * - Unauthorized access detection
 * - Incident report generation
 *
 * Scenario:
 * Security incident investigation:
 * 1. Detect anomalous access pattern
 * 2. Identify affected data subjects
 * 3. Reconstruct access timeline
 * 4. Determine scope of exposure
 * 5. Generate incident report for regulators
 *
 * Run with:
 * npx hardhat run examples/08-compliance-audit/05-breach-investigation.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Compliance: Breach Investigation");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up breach investigation scenario...\n");

  const [deployer, securityTeam, employee, maliciousActor, victim1, victim2, victim3] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Security Team:   ${securityTeam.address.slice(0, 10)}... (Investigator)`);
  console.log(`  Employee:        ${employee.address.slice(0, 10)}... (Legitimate user)`);
  console.log(`  Suspicious:      ${maliciousActor.address.slice(0, 10)}... (Under investigation)`);
  console.log(`  Victims:         3 potentially affected data subjects`);

  // Deploy contracts
  const AuditLogFactory = await ethers.getContractFactory("ConsentAuditLog");
  const auditLog = await AuditLogFactory.deploy();
  await auditLog.waitForDeployment();

  const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
  const dataProvenance = await DataProvenanceFactory.deploy();
  await dataProvenance.waitForDeployment();

  console.log(`\nContracts deployed for breach investigation`);

  // Authorize actors
  await auditLog.setAuthorizedRecorder(employee.address, true);
  await auditLog.setAuthorizedRecorder(maliciousActor.address, true);
  await auditLog.setAuthorizedRecorder(securityTeam.address, true);

  // Audit actions
  const AuditAction = {
    ConsentGiven: 0,
    ConsentRevoked: 1,
    DataRegistered: 3,
    DataAccessed: 4,
    DataDeleted: 5,
    DataTransformed: 6,
    DataExported: 7
  };

  const ActionNames = ["ConsentGiven", "ConsentRevoked", "ConsentExpired",
    "DataRegistered", "DataAccessed", "DataDeleted", "DataTransformed", "DataExported"];

  // Subject IDs
  const victims = [victim1, victim2, victim3];
  const victimIds = victims.map(v => ethers.keccak256(ethers.toUtf8Bytes(v.address)));

  // Data hashes
  const sensitiveData = victims.map((_, i) =>
    ethers.keccak256(ethers.toUtf8Bytes(`sensitive_data_${i}`))
  );

  // === SIMULATE HISTORICAL ACCESS (Normal operations) ===
  console.log("\n>>> Simulating normal operations history...");

  // Employee legitimate access
  for (let i = 0; i < 3; i++) {
    await auditLog.connect(employee).recordAudit(
      AuditAction.DataAccessed,
      victimIds[i],
      sensitiveData[i],
      JSON.stringify({
        purpose: "customer_support",
        ticket: `SUPPORT-${1000 + i}`,
        businessJustification: "Customer inquiry response"
      })
    );
  }
  console.log("    ✓ Normal employee access (3 records)");

  // === SIMULATE SUSPICIOUS ACTIVITY ===
  console.log("\n>>> Simulating suspicious activity...");

  // Suspicious actor - bulk data access
  for (let i = 0; i < 3; i++) {
    await auditLog.connect(maliciousActor).recordAudit(
      AuditAction.DataAccessed,
      victimIds[i],
      sensitiveData[i],
      JSON.stringify({
        purpose: "unspecified",
        accessTime: "03:42:15", // Unusual hour
        sourceIP: "unknown"
      })
    );
  }
  console.log("    ⚠ Suspicious bulk access detected (3 records)");

  // Suspicious actor - data export attempt
  await auditLog.connect(maliciousActor).recordAudit(
    AuditAction.DataExported,
    victimIds[0],
    sensitiveData[0],
    JSON.stringify({
      destination: "external",
      format: "csv",
      recordCount: 1500
    })
  );
  console.log("    ⚠ Data export detected (1 record)");

  // Additional suspicious access to same subject
  await auditLog.connect(maliciousActor).recordAudit(
    AuditAction.DataAccessed,
    victimIds[0],
    sensitiveData[0],
    JSON.stringify({
      purpose: "unknown",
      repeated: true
    })
  );
  console.log("    ⚠ Repeated access to victim 1 data");

  // === BREACH INVESTIGATION ===

  // Step 1: Identify suspicious actor activity
  console.log("\n>>> Step 1: Analyze suspicious actor activity");

  const suspiciousActorAudits = await auditLog.getAuditsByActor(maliciousActor.address);
  console.log(`\n    Suspicious actor total actions: ${suspiciousActorAudits.length}`);

  const suspiciousEntries = [];
  for (const idx of suspiciousActorAudits) {
    const entry = await auditLog.getAuditEntry(idx);
    suspiciousEntries.push(entry);
  }

  // Analyze patterns
  const accessCount = suspiciousEntries.filter(e => e.action === AuditAction.DataAccessed).length;
  const exportCount = suspiciousEntries.filter(e => e.action === AuditAction.DataExported).length;
  const uniqueSubjects = new Set(suspiciousEntries.map(e => e.subjectId)).size;

  console.log(`    Access events: ${accessCount}`);
  console.log(`    Export events: ${exportCount}`);
  console.log(`    Unique subjects affected: ${uniqueSubjects}`);

  // Step 2: Identify affected data subjects
  console.log("\n>>> Step 2: Identify affected data subjects");

  const affectedSubjects = new Set<string>();
  const affectedData = new Set<string>();

  for (const entry of suspiciousEntries) {
    affectedSubjects.add(entry.subjectId);
    if (entry.relatedData !== ethers.ZeroHash) {
      affectedData.add(entry.relatedData);
    }
  }

  console.log(`\n    AFFECTED DATA SUBJECTS:`);
  console.log("    ─────────────────────────────────────────────────────");
  let victimNum = 1;
  for (const subjectId of affectedSubjects) {
    const accessEvents = suspiciousEntries.filter(e => e.subjectId === subjectId);
    const wasExported = accessEvents.some(e => e.action === AuditAction.DataExported);

    console.log(`\n    Victim ${victimNum}:`);
    console.log(`      Subject ID: ${subjectId.slice(0, 25)}...`);
    console.log(`      Access events: ${accessEvents.length}`);
    console.log(`      Data exported: ${wasExported ? "YES ⚠" : "NO"}`);
    console.log(`      Risk level: ${wasExported ? "HIGH" : "MEDIUM"}`);
    victimNum++;
  }

  // Step 3: Reconstruct timeline
  console.log("\n>>> Step 3: Reconstruct access timeline");

  console.log("\n    INCIDENT TIMELINE:");
  console.log("    ═══════════════════════════════════════════════════════");

  for (let i = 0; i < suspiciousEntries.length; i++) {
    const entry = suspiciousEntries[i];
    const block = await ethers.provider.getBlock(entry.timestamp);

    let metadata = {};
    try {
      metadata = JSON.parse(entry.metadata);
    } catch { }

    console.log(`\n    Event ${i + 1}:`);
    console.log(`      Block: ${entry.timestamp}`);
    console.log(`      Action: ${ActionNames[entry.action]}`);
    console.log(`      Subject: ${entry.subjectId.slice(0, 20)}...`);
    console.log(`      Data: ${entry.relatedData.slice(0, 20)}...`);

    if (Object.keys(metadata).length > 0) {
      console.log("      Details:");
      for (const [key, value] of Object.entries(metadata)) {
        console.log(`        ${key}: ${value}`);
      }
    }
  }

  // Step 4: Compare with legitimate access
  console.log("\n>>> Step 4: Compare with legitimate employee access");

  const employeeAudits = await auditLog.getAuditsByActor(employee.address);

  console.log("\n    ACCESS COMPARISON:");
  console.log("    ─────────────────────────────────────────────────────");
  console.log(`\n    Legitimate Employee:`);
  console.log(`      Total actions: ${employeeAudits.length}`);
  console.log("      Purpose: customer_support (documented)");
  console.log("      Pattern: Single access per subject");
  console.log("      Exports: 0");

  console.log(`\n    Suspicious Actor:`);
  console.log(`      Total actions: ${suspiciousActorAudits.length}`);
  console.log("      Purpose: unspecified/unknown");
  console.log("      Pattern: Multiple accesses, bulk behavior");
  console.log(`      Exports: ${exportCount}`);

  console.log("\n    ANOMALIES DETECTED:");
  console.log("      ⚠ Unusual access time (03:42)");
  console.log("      ⚠ No business justification");
  console.log("      ⚠ Bulk data export");
  console.log("      ⚠ Repeated access to same subject");
  console.log("      ⚠ Unknown source IP");

  // Step 5: Determine breach scope
  console.log("\n>>> Step 5: Determine breach scope");

  const breachScope = {
    affectedSubjects: affectedSubjects.size,
    affectedRecords: affectedData.size,
    dataExported: exportCount > 0,
    exportedRecords: exportCount > 0 ? 1500 : 0, // From metadata
    timespan: {
      firstAccess: Number(suspiciousEntries[0].timestamp),
      lastAccess: Number(suspiciousEntries[suspiciousEntries.length - 1].timestamp)
    }
  };

  console.log("\n    BREACH SCOPE ASSESSMENT:");
  console.log("    ─────────────────────────────────────────────────────");
  console.log(`    Affected data subjects: ${breachScope.affectedSubjects}`);
  console.log(`    Affected data records: ${breachScope.affectedRecords}`);
  console.log(`    Data exfiltration: ${breachScope.dataExported ? "CONFIRMED" : "NOT DETECTED"}`);
  console.log(`    Records potentially exposed: ${breachScope.exportedRecords}`);
  console.log(`    Breach duration: ${breachScope.timespan.lastAccess - breachScope.timespan.firstAccess} blocks`);

  // Step 6: Generate incident report
  console.log("\n>>> Step 6: Generate Incident Report");

  const reportId = ethers.keccak256(ethers.toUtf8Bytes(`incident_${Date.now()}`));
  const reportDate = new Date().toISOString();

  console.log("\n");
  console.log("    ╔═══════════════════════════════════════════════════════════╗");
  console.log("    ║                                                           ║");
  console.log("    ║           SECURITY INCIDENT REPORT                        ║");
  console.log("    ║           CONFIDENTIAL - INTERNAL USE ONLY                ║");
  console.log("    ║                                                           ║");
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log(`    ║  Report ID: ${reportId.slice(0, 20)}...                   ║`);
  console.log(`    ║  Generated: ${reportDate.slice(0, 19)}                     ║`);
  console.log("    ║  Classification: HIGH SEVERITY                            ║");
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log("    ║                                                           ║");
  console.log("    ║  INCIDENT SUMMARY                                         ║");
  console.log("    ║  ─────────────────────────────────────────────────────    ║");
  console.log("    ║  Unauthorized data access and potential exfiltration     ║");
  console.log("    ║  detected from internal actor account.                   ║");
  console.log("    ║                                                           ║");
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log("    ║                                                           ║");
  console.log("    ║  AFFECTED PARTIES                                         ║");
  console.log("    ║  ─────────────────────────────────────────────────────    ║");
  console.log(`    ║  Data subjects affected: ${breachScope.affectedSubjects}                             ║`);
  console.log(`    ║  Records accessed: ${breachScope.affectedRecords}                                    ║`);
  console.log(`    ║  Records exported: ${breachScope.exportedRecords}                                ║`);
  console.log("    ║                                                           ║");
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log("    ║                                                           ║");
  console.log("    ║  SUSPICIOUS ACTOR                                         ║");
  console.log("    ║  ─────────────────────────────────────────────────────    ║");
  console.log(`    ║  Address: ${maliciousActor.address}  ║`);
  console.log(`    ║  Total suspicious actions: ${suspiciousActorAudits.length}                           ║`);
  console.log("    ║  Access pattern: Bulk, repeated, unusual hours           ║");
  console.log("    ║                                                           ║");
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log("    ║                                                           ║");
  console.log("    ║  EVIDENCE (Blockchain-Verified)                           ║");
  console.log("    ║  ─────────────────────────────────────────────────────    ║");
  console.log(`    ║  Audit entries: ${suspiciousActorAudits.length} immutable records                     ║`);
  console.log(`    ║  First incident: Block ${breachScope.timespan.firstAccess}                            ║`);
  console.log(`    ║  Last incident: Block ${breachScope.timespan.lastAccess}                             ║`);
  console.log(`    ║  Contract: ${await auditLog.getAddress()}  ║`);
  console.log("    ║                                                           ║");
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log("    ║                                                           ║");
  console.log("    ║  REGULATORY NOTIFICATION REQUIRED                         ║");
  console.log("    ║  ─────────────────────────────────────────────────────    ║");
  console.log("    ║  ✓ GDPR Article 33: Notify authority within 72 hours     ║");
  console.log("    ║  ✓ GDPR Article 34: Notify affected data subjects        ║");
  console.log("    ║  ✓ Document all containment measures                     ║");
  console.log("    ║                                                           ║");
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log("    ║                                                           ║");
  console.log("    ║  RECOMMENDED ACTIONS                                      ║");
  console.log("    ║  ─────────────────────────────────────────────────────    ║");
  console.log("    ║  1. Immediately revoke suspicious actor access           ║");
  console.log("    ║  2. Preserve all audit logs as evidence                  ║");
  console.log("    ║  3. Notify affected data subjects                        ║");
  console.log("    ║  4. File regulatory notification                         ║");
  console.log("    ║  5. Conduct full forensic analysis                       ║");
  console.log("    ║  6. Review access control policies                       ║");
  console.log("    ║                                                           ║");
  console.log("    ╚═══════════════════════════════════════════════════════════╝");

  // Step 7: Export forensic evidence
  console.log("\n>>> Step 7: Export forensic evidence package");

  const forensicPackage = {
    incident: {
      reportId: reportId,
      timestamp: reportDate,
      severity: "HIGH",
      type: "UNAUTHORIZED_ACCESS_AND_EXFILTRATION"
    },
    actor: {
      address: maliciousActor.address,
      actionCount: suspiciousActorAudits.length,
      auditIndices: suspiciousActorAudits.map(i => Number(i))
    },
    scope: {
      subjectsAffected: breachScope.affectedSubjects,
      recordsAccessed: breachScope.affectedRecords,
      dataExported: breachScope.dataExported,
      recordsExposed: breachScope.exportedRecords
    },
    timeline: {
      firstIncident: breachScope.timespan.firstAccess,
      lastIncident: breachScope.timespan.lastAccess,
      events: suspiciousEntries.map(e => ({
        block: Number(e.timestamp),
        action: ActionNames[e.action],
        subject: e.subjectId.slice(0, 20) + "...",
        data: e.relatedData.slice(0, 20) + "..."
      }))
    },
    verification: {
      contract: await auditLog.getAddress(),
      immutable: true,
      cryptographicProof: true
    }
  };

  console.log("\n    FORENSIC EVIDENCE PACKAGE (JSON):");
  console.log("    ─────────────────────────────────────────────────────");
  console.log(JSON.stringify(forensicPackage, null, 2).split('\n').map(l => '    ' + l).join('\n'));

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Investigation Capabilities:");
  console.log("  • Actor activity analysis");
  console.log("  • Affected subject identification");
  console.log("  • Timeline reconstruction");
  console.log("  • Anomaly detection");
  console.log("  • Incident report generation");
  console.log("  • Forensic evidence export");
  console.log("\n  Blockchain Benefits:");
  console.log("  • Immutable audit trail");
  console.log("  • Cryptographic verification");
  console.log("  • Tamper-evident records");
  console.log("  • Regulatory-ready evidence");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
