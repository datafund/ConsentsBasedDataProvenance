/**
 * Example: Audit Log Queries
 * Scenario: Compliance & Audit
 * Persona: Auditors, Compliance Officers, Regulators
 *
 * This example demonstrates:
 * - ConsentAuditLog query patterns
 * - Subject-based queries (DSAR support)
 * - Actor-based queries (employee audits)
 * - Time-range queries (period audits)
 * - Action-type filtering
 *
 * Scenario:
 * Regulatory audit preparation:
 * 1. Generate audit data across multiple actors
 * 2. Query by data subject for DSAR
 * 3. Query by actor for employee audit
 * 4. Query by action type
 * 5. Generate exportable audit report
 *
 * Run with:
 * npx hardhat run examples/08-compliance-audit/03-audit-log-queries.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Compliance: Audit Log Queries");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up audit log query scenario...\n");

  const [deployer, employee1, employee2, subject1, subject2, subject3] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Employee 1:  ${employee1.address.slice(0, 10)}... (Data analyst)`);
  console.log(`  Employee 2:  ${employee2.address.slice(0, 10)}... (Marketing)`);
  console.log(`  Subject 1:   ${subject1.address.slice(0, 10)}... (Customer)`);
  console.log(`  Subject 2:   ${subject2.address.slice(0, 10)}... (Customer)`);
  console.log(`  Subject 3:   ${subject3.address.slice(0, 10)}... (Customer)`);

  // Deploy ConsentAuditLog
  const AuditLogFactory = await ethers.getContractFactory("ConsentAuditLog");
  const auditLog = await AuditLogFactory.deploy();
  await auditLog.waitForDeployment();

  console.log(`\nConsentAuditLog deployed at: ${await auditLog.getAddress()}`);

  // Authorize employees as recorders
  await auditLog.setAuthorizedRecorder(employee1.address, true);
  await auditLog.setAuthorizedRecorder(employee2.address, true);
  console.log("    ✓ Employees authorized as recorders");

  // Audit action types
  const AuditAction = {
    ConsentGiven: 0,
    ConsentRevoked: 1,
    ConsentExpired: 2,
    DataRegistered: 3,
    DataAccessed: 4,
    DataDeleted: 5,
    DataTransformed: 6,
    AccessGranted: 7,
    AccessRevoked: 8
  };

  const ActionNames = [
    "ConsentGiven", "ConsentRevoked", "ConsentExpired",
    "DataRegistered", "DataAccessed", "DataDeleted",
    "DataTransformed", "AccessGranted", "AccessRevoked"
  ];

  // Subject IDs (hashed identifiers)
  const subjectIds = {
    subject1: ethers.keccak256(ethers.toUtf8Bytes(subject1.address)),
    subject2: ethers.keccak256(ethers.toUtf8Bytes(subject2.address)),
    subject3: ethers.keccak256(ethers.toUtf8Bytes(subject3.address))
  };

  // Data hashes
  const dataHashes = {
    data1: ethers.keccak256(ethers.toUtf8Bytes("customer_profile_1")),
    data2: ethers.keccak256(ethers.toUtf8Bytes("customer_profile_2")),
    data3: ethers.keccak256(ethers.toUtf8Bytes("marketing_list"))
  };

  // === SCENARIO ===

  // Step 1: Generate comprehensive audit data
  console.log("\n>>> Step 1: Generating comprehensive audit data");

  // Employee 1 activities (Data analyst)
  console.log("\n    Employee 1 (Data analyst) activities:");

  await auditLog.connect(employee1).recordAudit(
    AuditAction.DataAccessed,
    subjectIds.subject1,
    dataHashes.data1,
    JSON.stringify({ purpose: "analytics", query: "customer_segments" })
  );
  console.log("      ✓ Accessed Subject 1 data for analytics");

  await auditLog.connect(employee1).recordAudit(
    AuditAction.DataTransformed,
    subjectIds.subject1,
    dataHashes.data1,
    JSON.stringify({ transformation: "aggregation", output: "segment_report" })
  );
  console.log("      ✓ Transformed Subject 1 data");

  await auditLog.connect(employee1).recordAudit(
    AuditAction.DataAccessed,
    subjectIds.subject2,
    dataHashes.data2,
    JSON.stringify({ purpose: "analytics", query: "customer_segments" })
  );
  console.log("      ✓ Accessed Subject 2 data for analytics");

  await auditLog.connect(employee1).recordAudit(
    AuditAction.DataTransformed,
    subjectIds.subject2,
    dataHashes.data2,
    JSON.stringify({ transformation: "anonymization", output: "anonymized_profile" })
  );
  console.log("      ✓ Anonymized Subject 2 data");

  // Employee 2 activities (Marketing)
  console.log("\n    Employee 2 (Marketing) activities:");

  await auditLog.connect(employee2).recordAudit(
    AuditAction.ConsentGiven,
    subjectIds.subject1,
    ethers.ZeroHash,
    JSON.stringify({ purpose: "email_marketing", campaign: "spring_2024" })
  );
  console.log("      ✓ Recorded Subject 1 marketing consent");

  await auditLog.connect(employee2).recordAudit(
    AuditAction.DataAccessed,
    subjectIds.subject1,
    dataHashes.data1,
    JSON.stringify({ purpose: "marketing", campaign: "spring_2024" })
  );
  console.log("      ✓ Accessed Subject 1 data for marketing");

  await auditLog.connect(employee2).recordAudit(
    AuditAction.ConsentGiven,
    subjectIds.subject3,
    ethers.ZeroHash,
    JSON.stringify({ purpose: "newsletter", subscription: "monthly" })
  );
  console.log("      ✓ Recorded Subject 3 newsletter consent");

  await auditLog.connect(employee2).recordAudit(
    AuditAction.AccessGranted,
    subjectIds.subject3,
    dataHashes.data3,
    JSON.stringify({ grantedTo: "partner_agency", purpose: "co_marketing" })
  );
  console.log("      ✓ Granted partner access to Subject 3 data");

  await auditLog.connect(employee2).recordAudit(
    AuditAction.ConsentRevoked,
    subjectIds.subject1,
    ethers.ZeroHash,
    JSON.stringify({ purpose: "email_marketing", reason: "customer_request" })
  );
  console.log("      ✓ Recorded Subject 1 consent revocation");

  // Step 2: Query by data subject (DSAR support)
  console.log("\n>>> Step 2: Query by data subject (DSAR)");
  console.log("    Supporting GDPR Article 15 - Right of Access\n");

  const subjectQueries = [
    { id: subjectIds.subject1, name: "Subject 1" },
    { id: subjectIds.subject2, name: "Subject 2" },
    { id: subjectIds.subject3, name: "Subject 3" }
  ];

  console.log("    DATA SUBJECT ACCESS REQUEST RESULTS:");
  console.log("    ─────────────────────────────────────────────────────");

  for (const subject of subjectQueries) {
    const count = await auditLog.getSubjectAuditCount(subject.id);
    console.log(`\n    ${subject.name}: ${count} audit entries`);

    if (count > 0n) {
      const indices = await auditLog.getAuditsBySubject(subject.id);
      console.log(`      Entry indices: [${indices.slice(0, 5).map(i => i.toString()).join(", ")}${indices.length > 5 ? "..." : ""}]`);

      // Get first entry details
      const firstEntry = await auditLog.getAuditEntry(indices[0]);
      console.log(`      First entry: ${ActionNames[firstEntry.action]}`);
      console.log(`      Metadata: ${firstEntry.metadata.slice(0, 50)}...`);
    }
  }

  // Step 3: Query by actor (Employee audit)
  console.log("\n>>> Step 3: Query by actor (Employee audit)");
  console.log("    Auditing employee data access patterns\n");

  const actorQueries = [
    { address: employee1.address, name: "Employee 1 (Analyst)" },
    { address: employee2.address, name: "Employee 2 (Marketing)" }
  ];

  console.log("    EMPLOYEE ACTIVITY AUDIT:");
  console.log("    ─────────────────────────────────────────────────────");

  for (const actor of actorQueries) {
    const count = await auditLog.getActorAuditCount(actor.address);
    console.log(`\n    ${actor.name}`);
    console.log(`      Total actions: ${count}`);

    if (count > 0n) {
      const indices = await auditLog.getAuditsByActor(actor.address);

      // Count action types
      const actionCounts: Record<number, number> = {};
      for (const idx of indices) {
        const entry = await auditLog.getAuditEntry(idx);
        actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
      }

      console.log("      Action breakdown:");
      for (const [action, count] of Object.entries(actionCounts)) {
        console.log(`        • ${ActionNames[Number(action)]}: ${count}`);
      }
    }
  }

  // Step 4: Query by action type
  console.log("\n>>> Step 4: Query by action type");
  console.log("    Filtering for specific compliance events\n");

  const totalEntries = await auditLog.getAuditCount();

  // Count all entries by action type
  const actionBreakdown: Record<number, number> = {};
  for (let i = 0; i < Number(totalEntries); i++) {
    const entry = await auditLog.getAuditEntry(i);
    actionBreakdown[entry.action] = (actionBreakdown[entry.action] || 0) + 1;
  }

  console.log("    ACTION TYPE SUMMARY:");
  console.log("    ─────────────────────────────────────────────────────");
  console.log(`    Total audit entries: ${totalEntries}\n`);

  for (const [action, count] of Object.entries(actionBreakdown)) {
    const percentage = ((count / Number(totalEntries)) * 100).toFixed(1);
    const bar = "█".repeat(Math.floor(count * 3));
    console.log(`    ${ActionNames[Number(action)].padEnd(18)} ${count} (${percentage}%) ${bar}`);
  }

  // Step 5: Detailed audit trail for specific subject
  console.log("\n>>> Step 5: Detailed audit trail for Subject 1");

  const subject1Indices = await auditLog.getAuditsBySubject(subjectIds.subject1);

  console.log("\n    COMPLETE AUDIT TRAIL - SUBJECT 1:");
  console.log("    ═══════════════════════════════════════════════════════");

  for (let i = 0; i < subject1Indices.length; i++) {
    const entry = await auditLog.getAuditEntry(subject1Indices[i]);
    const block = await ethers.provider.getBlock(entry.timestamp);
    const timestamp = block ? new Date(block.timestamp * 1000).toISOString() : "Unknown";

    console.log(`\n    Entry ${i + 1}:`);
    console.log(`      Index: ${subject1Indices[i]}`);
    console.log(`      Action: ${ActionNames[entry.action]}`);
    console.log(`      Actor: ${entry.actor.slice(0, 15)}...`);
    console.log(`      Block: ${entry.timestamp}`);
    console.log(`      Data: ${entry.relatedData === ethers.ZeroHash ? "(none)" : entry.relatedData.slice(0, 20) + "..."}`);

    // Parse metadata
    try {
      const metadata = JSON.parse(entry.metadata);
      console.log(`      Metadata:`);
      for (const [key, value] of Object.entries(metadata)) {
        console.log(`        ${key}: ${value}`);
      }
    } catch {
      console.log(`      Metadata: ${entry.metadata}`);
    }
  }

  // Step 6: Generate exportable audit report
  console.log("\n>>> Step 6: Generate exportable audit report");

  const report = {
    reportId: ethers.keccak256(ethers.toUtf8Bytes(`audit_report_${Date.now()}`)),
    generatedAt: new Date().toISOString(),
    contract: await auditLog.getAddress(),
    summary: {
      totalEntries: Number(totalEntries),
      uniqueSubjects: subjectQueries.length,
      uniqueActors: actorQueries.length,
      actionBreakdown: Object.fromEntries(
        Object.entries(actionBreakdown).map(([k, v]) => [ActionNames[Number(k)], v])
      )
    },
    subjectSummary: await Promise.all(subjectQueries.map(async (s) => ({
      subjectId: s.id.slice(0, 20) + "...",
      entryCount: Number(await auditLog.getSubjectAuditCount(s.id))
    }))),
    actorSummary: await Promise.all(actorQueries.map(async (a) => ({
      actorId: a.address.slice(0, 20) + "...",
      entryCount: Number(await auditLog.getActorAuditCount(a.address))
    })))
  };

  console.log("\n    EXPORTABLE AUDIT REPORT (JSON):");
  console.log("    ─────────────────────────────────────────────────────");
  console.log(JSON.stringify(report, null, 2).split('\n').map(l => '    ' + l).join('\n'));

  // === AUDIT QUERY REPORT ===

  console.log("\n" + "-".repeat(60));
  console.log("  Audit Query Capabilities");
  console.log("-".repeat(60));

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           AUDIT LOG QUERY CAPABILITIES                  │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  QUERY PATTERNS SUPPORTED                               │");
  console.log("    │    ✓ By Subject (getAuditsBySubject)                   │");
  console.log("    │      → GDPR Article 15 DSAR support                    │");
  console.log("    │    ✓ By Actor (getAuditsByActor)                       │");
  console.log("    │      → Employee access auditing                        │");
  console.log("    │    ✓ By Index (getAuditEntry)                          │");
  console.log("    │      → Sequential audit traversal                      │");
  console.log("    │    ✓ Count queries for pagination                      │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  COMPLIANCE USE CASES                                   │");
  console.log("    │    • GDPR Article 15: Data subject access requests     │");
  console.log("    │    • GDPR Article 30: Records of processing            │");
  console.log("    │    • HIPAA: Disclosure accounting                      │");
  console.log("    │    • SOX: Financial data access audit                  │");
  console.log("    │    • Internal: Employee activity monitoring            │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  DATA AVAILABLE                                         │");
  console.log("    │    • Action type (consent, access, deletion, etc.)    │");
  console.log("    │    • Actor address (who performed action)              │");
  console.log("    │    • Subject ID (whose data was affected)              │");
  console.log("    │    • Related data hash (what data)                     │");
  console.log("    │    • Timestamp (block number)                          │");
  console.log("    │    • Metadata (purpose, context)                       │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Query Patterns Demonstrated:");
  console.log("  • Subject-based: Who accessed my data?");
  console.log("  • Actor-based: What did employee X do?");
  console.log("  • Action-based: All consent revocations");
  console.log("  • Full trail: Complete history for subject");
  console.log("\n  Compliance Support:");
  console.log("  • GDPR Article 15: Data subject access requests");
  console.log("  • GDPR Article 30: Processing activity records");
  console.log("  • HIPAA: Disclosure accounting requirements");
  console.log("  • Internal audits: Employee activity review");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
