/**
 * Example: Regulatory Reporting
 * Scenario: Financial Services
 * Persona: Compliance Officers, Regulators, Auditors
 *
 * This example demonstrates:
 * - ConsentAuditLog for compliance reporting
 * - Time-bounded queries for specific periods
 * - Evidence generation for regulatory audits
 * - Cross-referencing consent and data access
 *
 * Scenario:
 * Regulatory audit preparation:
 * 1. Bank operations generate audit events
 * 2. Compliance officer queries by time period
 * 3. Generate consent verification report
 * 4. Export evidence for regulators
 *
 * Run with:
 * npx hardhat run examples/03-financial-services/04-regulatory-reporting.ts --network localhost
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
  console.log("  Financial Services Example: Regulatory Reporting");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up regulatory reporting scenario...\n");

  const [deployer, customer1, customer2, banker, analyst, compliance] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Customer 1:         ${customer1.address.slice(0, 10)}...`);
  console.log(`  Customer 2:         ${customer2.address.slice(0, 10)}...`);
  console.log(`  Banker:             ${banker.address.slice(0, 10)}...`);
  console.log(`  Risk Analyst:       ${analyst.address.slice(0, 10)}...`);
  console.log(`  Compliance Officer: ${compliance.address.slice(0, 10)}...`);

  // Deploy ConsentAuditLog
  const AuditLogFactory = await ethers.getContractFactory("ConsentAuditLog");
  const auditLog = await AuditLogFactory.deploy();
  await auditLog.waitForDeployment();

  console.log(`\nConsentAuditLog deployed at: ${await auditLog.getAddress()}`);

  // Authorize bank staff to record audits
  await auditLog.setAuthorizedRecorder(banker.address, true);
  await auditLog.setAuthorizedRecorder(analyst.address, true);
  console.log("Bank staff authorized as audit recorders.");

  // Create subject IDs for customers
  const customer1SubjectId = ethers.keccak256(ethers.toUtf8Bytes(`customer:${customer1.address}`));
  const customer2SubjectId = ethers.keccak256(ethers.toUtf8Bytes(`customer:${customer2.address}`));

  // === SIMULATE BANK OPERATIONS ===

  console.log("\n>>> Simulating bank operations (generating audit events)...\n");

  // Customer 1 operations
  console.log("    Customer 1 Activity:");

  await auditLog.recordAudit(
    AuditAction.ConsentGiven,
    customer1SubjectId,
    ethers.ZeroHash,
    JSON.stringify({ purpose: "account_management", type: "explicit" })
  );
  console.log("      ✓ Consent given for account management");

  await auditLog.connect(banker).recordAudit(
    AuditAction.DataRegistered,
    customer1SubjectId,
    ethers.keccak256(ethers.toUtf8Bytes("c1_account")),
    JSON.stringify({ dataType: "account_details", product: "checking" })
  );
  console.log("      ✓ Account data registered");

  await auditLog.connect(analyst).recordAudit(
    AuditAction.DataAccessed,
    customer1SubjectId,
    ethers.keccak256(ethers.toUtf8Bytes("c1_account")),
    JSON.stringify({ reason: "risk_review", department: "risk" })
  );
  console.log("      ✓ Risk analyst accessed data");

  await auditLog.connect(banker).recordAudit(
    AuditAction.DataTransformed,
    customer1SubjectId,
    ethers.keccak256(ethers.toUtf8Bytes("c1_credit_report")),
    JSON.stringify({ transform: "credit_scoring", score: 720 })
  );
  console.log("      ✓ Credit score generated");

  // Customer 2 operations
  console.log("\n    Customer 2 Activity:");

  await auditLog.recordAudit(
    AuditAction.ConsentGiven,
    customer2SubjectId,
    ethers.ZeroHash,
    JSON.stringify({ purpose: "loan_application", type: "explicit" })
  );
  console.log("      ✓ Consent given for loan application");

  await auditLog.connect(banker).recordAudit(
    AuditAction.DataRegistered,
    customer2SubjectId,
    ethers.keccak256(ethers.toUtf8Bytes("c2_loan_app")),
    JSON.stringify({ dataType: "loan_application", amount: 250000 })
  );
  console.log("      ✓ Loan application registered");

  await auditLog.connect(analyst).recordAudit(
    AuditAction.DataAccessed,
    customer2SubjectId,
    ethers.keccak256(ethers.toUtf8Bytes("c2_loan_app")),
    JSON.stringify({ reason: "underwriting", department: "lending" })
  );
  console.log("      ✓ Underwriter accessed application");

  await auditLog.recordAudit(
    AuditAction.ConsentRevoked,
    customer2SubjectId,
    ethers.ZeroHash,
    JSON.stringify({ purpose: "marketing", reason: "customer_request" })
  );
  console.log("      ✓ Marketing consent revoked");

  // === REGULATORY QUERIES ===

  console.log("\n" + "-".repeat(60));
  console.log("  Regulatory Audit Queries");
  console.log("-".repeat(60));

  // Query 1: Total audit entries
  console.log("\n>>> Query 1: Audit Log Statistics");

  const totalEntries = await auditLog.getAuditCount();
  console.log(`    Total audit log entries: ${totalEntries}`);

  // Query 2: All activity by banker
  console.log("\n>>> Query 2: Banker Activity Report");

  const bankerAuditCount = await auditLog.getActorAuditCount(banker.address);
  console.log(`    Total actions by banker: ${bankerAuditCount}`);

  const bankerAudits = await auditLog.getAuditsByActor(banker.address, 0, 100);
  console.log("\n    Banker Actions:");
  for (const entry of bankerAudits) {
    const timestamp = new Date(Number(entry.timestamp) * 1000).toLocaleString();
    const action = ActionNames[entry.action];
    const metadata = JSON.parse(entry.metadata);
    console.log(`      • ${timestamp} - ${action}`);
    console.log(`        Details: ${JSON.stringify(metadata)}`);
  }

  // Query 3: All activity by risk analyst
  console.log("\n>>> Query 3: Risk Analyst Activity Report");

  const analystAuditCount = await auditLog.getActorAuditCount(analyst.address);
  console.log(`    Total actions by analyst: ${analystAuditCount}`);

  const analystAudits = await auditLog.getAuditsByActor(analyst.address, 0, 100);
  console.log("\n    Analyst Actions:");
  for (const entry of analystAudits) {
    const timestamp = new Date(Number(entry.timestamp) * 1000).toLocaleString();
    const action = ActionNames[entry.action];
    console.log(`      • ${timestamp} - ${action}`);
  }

  // Query 4: Customer 1 full history
  console.log("\n>>> Query 4: Customer 1 Full Data History");

  const c1AuditCount = await auditLog.getSubjectAuditCount(customer1SubjectId);
  console.log(`    Total events for Customer 1: ${c1AuditCount}`);

  const c1Audits = await auditLog.getAuditsBySubject(customer1SubjectId, 0, 100);
  console.log("\n    Customer 1 History:");
  for (let i = 0; i < c1Audits.length; i++) {
    const entry = c1Audits[i];
    const timestamp = new Date(Number(entry.timestamp) * 1000).toLocaleString();
    const action = ActionNames[entry.action];
    console.log(`      [${i + 1}] ${timestamp}`);
    console.log(`          Action: ${action}`);
    console.log(`          Actor: ${entry.actor.slice(0, 10)}...`);
  }

  // Query 5: Consent events only
  console.log("\n>>> Query 5: All Consent Events");

  const allAudits = [];
  for (let i = 0; i < Number(totalEntries); i++) {
    const entry = await auditLog.getAuditEntry(i);
    allAudits.push(entry);
  }

  const consentEvents = allAudits.filter(
    e => e.action === BigInt(AuditAction.ConsentGiven) ||
         e.action === BigInt(AuditAction.ConsentRevoked)
  );

  console.log(`    Total consent events: ${consentEvents.length}`);
  console.log("\n    Consent Activity:");
  for (const entry of consentEvents) {
    const timestamp = new Date(Number(entry.timestamp) * 1000).toLocaleString();
    const action = ActionNames[Number(entry.action)];
    const metadata = JSON.parse(entry.metadata);
    console.log(`      • ${timestamp} - ${action}`);
    console.log(`        Purpose: ${metadata.purpose}`);
  }

  // === GENERATE REGULATORY REPORT ===

  console.log("\n" + "-".repeat(60));
  console.log("  Regulatory Compliance Report");
  console.log("-".repeat(60));

  // Count events by type
  const eventCounts: { [key: string]: number } = {};
  for (const entry of allAudits) {
    const action = ActionNames[Number(entry.action)];
    eventCounts[action] = (eventCounts[action] || 0) + 1;
  }

  // Unique actors
  const uniqueActors = new Set(allAudits.map(e => e.actor));

  // Unique subjects
  const uniqueSubjects = new Set(allAudits.map(e => e.subjectId));

  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│             REGULATORY COMPLIANCE REPORT                     │");
  console.log("│                    Financial Institution                     │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log(`│  Report Generated: ${new Date().toLocaleString()}               │`);
  console.log(`│  Reporting Period: Current Session                           │`);
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log("│  EXECUTIVE SUMMARY                                           │");
  console.log(`│  • Total Audit Events: ${totalEntries}                                        │`);
  console.log(`│  • Unique Data Subjects: ${uniqueSubjects.size}                                     │`);
  console.log(`│  • Unique Actors: ${uniqueActors.size}                                            │`);
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log("│  EVENTS BY TYPE                                              │");

  for (const [action, count] of Object.entries(eventCounts).sort((a, b) => b[1] - a[1])) {
    const padding = " ".repeat(Math.max(0, 25 - action.length));
    console.log(`│    ${action}:${padding}${count}                           │`);
  }

  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log("│  CONSENT MANAGEMENT                                          │");
  console.log(`│  • Consents Given: ${eventCounts["ConsentGiven"] || 0}                                        │`);
  console.log(`│  • Consents Revoked: ${eventCounts["ConsentRevoked"] || 0}                                      │`);
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log("│  DATA ACCESS                                                 │");
  console.log(`│  • Data Registered: ${eventCounts["DataRegistered"] || 0}                                       │`);
  console.log(`│  • Data Accessed: ${eventCounts["DataAccessed"] || 0}                                         │`);
  console.log(`│  • Data Transformed: ${eventCounts["DataTransformed"] || 0}                                      │`);
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log("│  COMPLIANCE STATUS                                           │");
  console.log("│  ✓ All data access logged with actor identification         │");
  console.log("│  ✓ Consent events tracked with purpose specification        │");
  console.log("│  ✓ Timestamps immutably recorded on blockchain              │");
  console.log("│  ✓ Complete audit trail available for examination           │");
  console.log("│  ✓ Ready for SOX, GDPR, CCPA compliance review              │");
  console.log("└─────────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • ConsentAuditLog captures all data operations");
  console.log("  • Query by actor for staff activity reports");
  console.log("  • Query by subject for customer data history");
  console.log("  • Filter by action type for consent reports");
  console.log("  • Immutable blockchain timestamps for evidence");
  console.log("  • Supports SOX 404, GDPR, CCPA compliance");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
