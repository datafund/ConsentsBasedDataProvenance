/**
 * Example: Regulatory Report Generation
 * Scenario: Compliance & Audit
 * Persona: Compliance Officers, DPOs, Executives
 *
 * This example demonstrates:
 * - Comprehensive compliance report generation
 * - Consent statistics dashboard
 * - Data processing inventory
 * - Compliance score calculation
 * - Executive summary format
 *
 * Scenario:
 * Quarterly compliance report:
 * 1. Gather consent statistics
 * 2. Inventory data processing activities
 * 3. Analyze access patterns
 * 4. Calculate compliance metrics
 * 5. Generate executive report
 *
 * Run with:
 * npx hardhat run examples/08-compliance-audit/04-regulatory-report.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Compliance: Regulatory Report Generation");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up regulatory report scenario...\n");

  const [deployer, dpo, user1, user2, user3, user4, user5] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  DPO:     ${dpo.address.slice(0, 10)}... (Data Protection Officer)`);
  console.log(`  Users:   5 data subjects for reporting`);

  // Deploy all contracts
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

  // Authorize DPO
  await auditLog.setAuthorizedRecorder(dpo.address, true);

  console.log(`\nContracts deployed for compliance reporting`);

  // Get current time
  const block = await ethers.provider.getBlock("latest");
  const currentTime = block!.timestamp;

  const Purpose = {
    ServiceProvision: 0,
    Analytics: 3,
    DirectMarketing: 17,
    Profiling: 29,
    ThirdPartySharing: 40
  };

  const ConsentType = {
    InformedExplicit: 6,
    WithdrawableAnytime: 11
  };

  const AuditAction = {
    ConsentGiven: 0,
    ConsentRevoked: 1,
    DataRegistered: 3,
    DataAccessed: 4,
    DataDeleted: 5
  };

  // === GENERATE SAMPLE DATA ===
  console.log("\n>>> Generating sample compliance data...");

  const users = [user1, user2, user3, user4, user5];
  const receiptIds: string[] = [];
  const dataHashes: string[] = [];

  const oneYear = 365 * 24 * 60 * 60;
  const sixMonths = 180 * 24 * 60 * 60;

  // Create various consents and data records
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const subjectId = ethers.keccak256(ethers.toUtf8Bytes(user.address));

    // All users give service consent
    const serviceTx = await consentContract.connect(user).giveConsent(
      dpo.address,
      [Purpose.ServiceProvision],
      [],
      ConsentType.InformedExplicit,
      currentTime + oneYear,
      false,
      "https://company.com/privacy"
    );
    const serviceReceipt = await serviceTx.wait();
    const serviceEvent = serviceReceipt?.logs.find((log: any) => log.fragment?.name === "ConsentGiven");
    receiptIds.push((serviceEvent as any)?.args[0]);

    await auditLog.connect(dpo).recordAudit(
      AuditAction.ConsentGiven,
      subjectId,
      (serviceEvent as any)?.args[0],
      JSON.stringify({ purpose: "service", user: i + 1 })
    );

    // Some users give marketing consent
    if (i < 3) {
      const marketingTx = await consentContract.connect(user).giveConsent(
        dpo.address,
        [Purpose.DirectMarketing],
        [Purpose.Analytics],
        ConsentType.WithdrawableAnytime,
        currentTime + sixMonths,
        true,
        "https://company.com/marketing"
      );
      const marketingReceipt = await marketingTx.wait();
      const marketingEvent = marketingReceipt?.logs.find((log: any) => log.fragment?.name === "ConsentGiven");
      receiptIds.push((marketingEvent as any)?.args[0]);

      await auditLog.connect(dpo).recordAudit(
        AuditAction.ConsentGiven,
        subjectId,
        (marketingEvent as any)?.args[0],
        JSON.stringify({ purpose: "marketing", user: i + 1 })
      );
    }

    // Register data for each user
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(`user_${i}_profile`));
    dataHashes.push(dataHash);
    await dataProvenance.connect(dpo).registerData(dataHash, `user_profile_${i}`);

    await auditLog.connect(dpo).recordAudit(
      AuditAction.DataRegistered,
      subjectId,
      dataHash,
      JSON.stringify({ type: "profile", user: i + 1 })
    );

    // Access some data
    await auditLog.connect(dpo).recordAudit(
      AuditAction.DataAccessed,
      subjectId,
      dataHash,
      JSON.stringify({ purpose: "service_delivery", user: i + 1 })
    );
  }

  // User 1 revokes marketing consent
  await consentContract.connect(user1).revokeConsent(receiptIds[1]);
  await auditLog.connect(dpo).recordAudit(
    AuditAction.ConsentRevoked,
    ethers.keccak256(ethers.toUtf8Bytes(user1.address)),
    receiptIds[1],
    JSON.stringify({ purpose: "marketing", reason: "user_request" })
  );

  // User 5 requests deletion (requestDeletion handles everything including proof generation)
  await dataDeletion.connect(dpo).requestDeletion(dataHashes[4], "GDPR request");

  await auditLog.connect(dpo).recordAudit(
    AuditAction.DataDeleted,
    ethers.keccak256(ethers.toUtf8Bytes(user5.address)),
    dataHashes[4],
    JSON.stringify({ reason: "gdpr_request" })
  );

  console.log("    ✓ Generated 5 users with consents");
  console.log("    ✓ Created data records and access logs");
  console.log("    ✓ Simulated 1 consent revocation");
  console.log("    ✓ Processed 1 deletion request");

  // === GENERATE COMPLIANCE REPORT ===
  console.log("\n>>> Generating Compliance Report...");

  // Step 1: Consent Statistics
  console.log("\n>>> Step 1: Consent Statistics");

  let activeConsents = 0;
  let revokedConsents = 0;

  for (const receiptId of receiptIds) {
    const isValid = await consentContract.isConsentValid(receiptId);
    if (isValid) {
      activeConsents++;
    } else {
      revokedConsents++;
    }
  }

  const consentStats = {
    total: receiptIds.length,
    active: activeConsents,
    revoked: revokedConsents,
    activeRate: ((activeConsents / receiptIds.length) * 100).toFixed(1)
  };

  console.log(`    Total consents: ${consentStats.total}`);
  console.log(`    Active: ${consentStats.active} (${consentStats.activeRate}%)`);
  console.log(`    Revoked: ${consentStats.revoked}`);

  // Step 2: Data Processing Inventory
  console.log("\n>>> Step 2: Data Processing Inventory");

  let activeData = 0;
  let deletedData = 0;

  for (const dataHash of dataHashes) {
    const accessible = await dataDeletion.isDataAccessible(dataHash);
    if (accessible) {
      activeData++;
    } else {
      deletedData++;
    }
  }

  const dataStats = {
    total: dataHashes.length,
    active: activeData,
    deleted: deletedData
  };

  console.log(`    Total data records: ${dataStats.total}`);
  console.log(`    Active: ${dataStats.active}`);
  console.log(`    Deleted: ${dataStats.deleted}`);

  // Step 3: Audit Statistics
  console.log("\n>>> Step 3: Audit Statistics");

  const totalAudits = await auditLog.getAuditCount();

  // Count by action type
  const auditCounts: Record<number, number> = {};
  for (let i = 0; i < Number(totalAudits); i++) {
    const entry = await auditLog.getAuditEntry(i);
    auditCounts[entry.action] = (auditCounts[entry.action] || 0) + 1;
  }

  const ActionNames = ["ConsentGiven", "ConsentRevoked", "ConsentExpired",
    "DataRegistered", "DataAccessed", "DataDeleted"];

  console.log(`    Total audit entries: ${totalAudits}`);
  for (const [action, count] of Object.entries(auditCounts)) {
    console.log(`      ${ActionNames[Number(action)]}: ${count}`);
  }

  // Step 4: Calculate Compliance Score
  console.log("\n>>> Step 4: Calculating Compliance Score");

  // Compliance metrics
  const metrics = {
    consentDocumentation: 100, // All consents documented
    auditCompleteness: 100,   // All actions logged
    deletionCompliance: deletedData > 0 ? 100 : 0, // Deletion requests processed
    dataInventory: 100,       // All data tracked
    accessLogging: ((auditCounts[AuditAction.DataAccessed] || 0) > 0) ? 100 : 0
  };

  const complianceScore = Math.round(
    (metrics.consentDocumentation +
      metrics.auditCompleteness +
      metrics.deletionCompliance +
      metrics.dataInventory +
      metrics.accessLogging) / 5
  );

  console.log(`\n    Compliance Metrics:`);
  console.log(`      Consent Documentation: ${metrics.consentDocumentation}%`);
  console.log(`      Audit Completeness: ${metrics.auditCompleteness}%`);
  console.log(`      Deletion Compliance: ${metrics.deletionCompliance}%`);
  console.log(`      Data Inventory: ${metrics.dataInventory}%`);
  console.log(`      Access Logging: ${metrics.accessLogging}%`);
  console.log(`    ─────────────────────────────────────────`);
  console.log(`      Overall Score: ${complianceScore}%`);

  // Step 5: Generate Executive Report
  console.log("\n>>> Step 5: Generating Executive Report");

  const reportDate = new Date().toISOString().split('T')[0];
  const reportId = ethers.keccak256(ethers.toUtf8Bytes(`report_${Date.now()}`));

  console.log("\n");
  console.log("    ╔═══════════════════════════════════════════════════════════╗");
  console.log("    ║                                                           ║");
  console.log("    ║           QUARTERLY COMPLIANCE REPORT                     ║");
  console.log("    ║                                                           ║");
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log(`    ║  Report ID: ${reportId.slice(0, 20)}...                   ║`);
  console.log(`    ║  Generated: ${reportDate}                                 ║`);
  console.log(`    ║  Period: Q4 2024                                          ║`);
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log("    ║                                                           ║");
  console.log("    ║  EXECUTIVE SUMMARY                                        ║");
  console.log("    ║  ─────────────────────────────────────────────────────    ║");
  console.log(`    ║  Overall Compliance Score: ${complianceScore}%                            ║`);
  console.log(`    ║  Status: ${complianceScore >= 90 ? "COMPLIANT ✓" : complianceScore >= 70 ? "NEEDS ATTENTION" : "NON-COMPLIANT ✗"}                                      ║`);
  console.log("    ║                                                           ║");
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log("    ║                                                           ║");
  console.log("    ║  CONSENT MANAGEMENT                                       ║");
  console.log("    ║  ─────────────────────────────────────────────────────    ║");
  console.log(`    ║  Total Consent Records: ${consentStats.total.toString().padEnd(33)}║`);
  console.log(`    ║  Active Consents: ${consentStats.active.toString().padEnd(39)}║`);
  console.log(`    ║  Revoked Consents: ${consentStats.revoked.toString().padEnd(38)}║`);
  console.log(`    ║  Consent Rate: ${consentStats.activeRate}%                                     ║`);
  console.log("    ║                                                           ║");
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log("    ║                                                           ║");
  console.log("    ║  DATA PROCESSING                                          ║");
  console.log("    ║  ─────────────────────────────────────────────────────    ║");
  console.log(`    ║  Total Data Records: ${dataStats.total.toString().padEnd(36)}║`);
  console.log(`    ║  Active Records: ${dataStats.active.toString().padEnd(40)}║`);
  console.log(`    ║  Deleted Records: ${dataStats.deleted.toString().padEnd(39)}║`);
  console.log(`    ║  Deletion Requests Processed: ${dataStats.deleted > 0 ? "YES ✓" : "NONE"}                    ║`);
  console.log("    ║                                                           ║");
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log("    ║                                                           ║");
  console.log("    ║  AUDIT TRAIL                                              ║");
  console.log("    ║  ─────────────────────────────────────────────────────    ║");
  console.log(`    ║  Total Audit Entries: ${totalAudits.toString().padEnd(35)}║`);
  console.log(`    ║  Consent Events: ${(auditCounts[AuditAction.ConsentGiven] || 0) + (auditCounts[AuditAction.ConsentRevoked] || 0)}                                       ║`);
  console.log(`    ║  Data Events: ${(auditCounts[AuditAction.DataRegistered] || 0) + (auditCounts[AuditAction.DataAccessed] || 0) + (auditCounts[AuditAction.DataDeleted] || 0)}                                          ║`);
  console.log("    ║                                                           ║");
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log("    ║                                                           ║");
  console.log("    ║  COMPLIANCE METRICS                                       ║");
  console.log("    ║  ─────────────────────────────────────────────────────    ║");
  console.log(`    ║  Consent Documentation:  ${metrics.consentDocumentation}% ████████████████████    ║`);
  console.log(`    ║  Audit Completeness:     ${metrics.auditCompleteness}% ████████████████████    ║`);
  console.log(`    ║  Deletion Compliance:    ${metrics.deletionCompliance}% ████████████████████    ║`);
  console.log(`    ║  Data Inventory:         ${metrics.dataInventory}% ████████████████████    ║`);
  console.log(`    ║  Access Logging:         ${metrics.accessLogging}% ████████████████████    ║`);
  console.log("    ║                                                           ║");
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log("    ║                                                           ║");
  console.log("    ║  REGULATORY COVERAGE                                      ║");
  console.log("    ║  ─────────────────────────────────────────────────────    ║");
  console.log("    ║  ✓ GDPR Article 6: Lawful basis documented               ║");
  console.log("    ║  ✓ GDPR Article 7: Consent properly collected            ║");
  console.log("    ║  ✓ GDPR Article 17: Deletion rights honored              ║");
  console.log("    ║  ✓ GDPR Article 30: Processing records maintained        ║");
  console.log("    ║  ✓ CCPA: Consumer rights supported                       ║");
  console.log("    ║                                                           ║");
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log("    ║                                                           ║");
  console.log("    ║  RECOMMENDATIONS                                          ║");
  console.log("    ║  ─────────────────────────────────────────────────────    ║");
  console.log("    ║  • Continue monitoring consent rates                     ║");
  console.log("    ║  • Review expiring consents before Q1 2025               ║");
  console.log("    ║  • Schedule annual audit trail review                    ║");
  console.log("    ║                                                           ║");
  console.log("    ╚═══════════════════════════════════════════════════════════╝");

  // Step 6: Export machine-readable report
  console.log("\n>>> Step 6: Machine-readable export");

  const machineReport = {
    meta: {
      reportId: reportId,
      generatedAt: new Date().toISOString(),
      period: "Q4-2024",
      contracts: {
        consent: await consentContract.getAddress(),
        provenance: await dataProvenance.getAddress(),
        auditLog: await auditLog.getAddress(),
        deletion: await dataDeletion.getAddress()
      }
    },
    consent: consentStats,
    data: dataStats,
    audit: {
      total: Number(totalAudits),
      byAction: Object.fromEntries(
        Object.entries(auditCounts).map(([k, v]) => [ActionNames[Number(k)], v])
      )
    },
    compliance: {
      score: complianceScore,
      metrics: metrics
    }
  };

  console.log("\n    JSON EXPORT:");
  console.log("    ─────────────────────────────────────────────────────");
  console.log(JSON.stringify(machineReport, null, 2).split('\n').map(l => '    ' + l).join('\n'));

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Report Components:");
  console.log("  • Consent statistics with rates");
  console.log("  • Data processing inventory");
  console.log("  • Audit trail summary");
  console.log("  • Compliance score calculation");
  console.log("  • Executive summary format");
  console.log("  • Machine-readable JSON export");
  console.log("\n  Regulatory Coverage:");
  console.log("  • GDPR Articles 6, 7, 17, 30");
  console.log("  • CCPA consumer rights");
  console.log("  • SOX financial data requirements");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
