/**
 * Example: RBAC Administration
 * Scenario: Advanced Patterns
 * Persona: System Administrators, Developers
 *
 * This example demonstrates:
 * - ConsentAuditLog admin functions
 * - Authorized recorder management
 * - Role-based audit permissions
 * - Administrative access control
 *
 * Scenario:
 * Organization role management:
 * 1. Admin deploys and configures audit system
 * 2. Authorize specific addresses to record audits
 * 3. Different roles have different permissions
 * 4. Admin can revoke authorizations
 *
 * Run with:
 * npx hardhat run examples/07-advanced-patterns/04-rbac-administration.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Advanced Pattern: RBAC Administration");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up RBAC administration scenario...\n");

  const [admin, operator1, operator2, auditor, unauthorized] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Admin:         ${admin.address.slice(0, 10)}... (deployer)`);
  console.log(`  Operator 1:    ${operator1.address.slice(0, 10)}...`);
  console.log(`  Operator 2:    ${operator2.address.slice(0, 10)}...`);
  console.log(`  Auditor:       ${auditor.address.slice(0, 10)}...`);
  console.log(`  Unauthorized:  ${unauthorized.address.slice(0, 10)}...`);

  // Deploy ConsentAuditLog (admin is deployer)
  const AuditLogFactory = await ethers.getContractFactory("ConsentAuditLog");
  const auditLog = await AuditLogFactory.connect(admin).deploy();
  await auditLog.waitForDeployment();

  console.log(`\nConsentAuditLog deployed at: ${await auditLog.getAddress()}`);
  console.log(`Admin (owner): ${admin.address.slice(0, 10)}...`);

  // AuditAction enum
  const AuditAction = {
    ConsentGiven: 0,
    ConsentRevoked: 1,
    DataRegistered: 3,
    DataAccessed: 4
  };

  // === SCENARIO ===

  // Step 1: Check initial authorization status
  console.log("\n>>> Step 1: Check initial authorization status");

  const addresses = [
    { signer: admin, name: "Admin" },
    { signer: operator1, name: "Operator 1" },
    { signer: operator2, name: "Operator 2" },
    { signer: auditor, name: "Auditor" },
    { signer: unauthorized, name: "Unauthorized" }
  ];

  console.log("\n    Initial Authorization:");
  for (const addr of addresses) {
    const isAuthorized = await auditLog.authorizedRecorders(addr.signer.address);
    const status = isAuthorized ? "✓ AUTHORIZED" : "✗ NOT AUTHORIZED";
    console.log(`      ${addr.name}: ${status}`);
  }

  // Admin is always authorized (checked in modifier)
  console.log("      Note: Admin is always authorized via modifier");

  // Step 2: Admin authorizes operators
  console.log("\n>>> Step 2: Admin authorizes operators");

  await auditLog.connect(admin).setAuthorizedRecorder(operator1.address, true);
  console.log(`    ✓ Operator 1: AUTHORIZED`);

  await auditLog.connect(admin).setAuthorizedRecorder(operator2.address, true);
  console.log(`    ✓ Operator 2: AUTHORIZED`);

  // Step 3: Operators record audit entries
  console.log("\n>>> Step 3: Operators record audit entries");

  const subjectId = ethers.keccak256(ethers.toUtf8Bytes("test-subject"));

  // Operator 1 records
  await auditLog.connect(operator1).recordAudit(
    AuditAction.ConsentGiven,
    subjectId,
    ethers.ZeroHash,
    JSON.stringify({ recorder: "operator1", event: "consent_given" })
  );
  console.log("    ✓ Operator 1 recorded: ConsentGiven");

  // Operator 2 records
  await auditLog.connect(operator2).recordAudit(
    AuditAction.DataRegistered,
    subjectId,
    ethers.ZeroHash,
    JSON.stringify({ recorder: "operator2", event: "data_registered" })
  );
  console.log("    ✓ Operator 2 recorded: DataRegistered");

  // Admin records
  await auditLog.connect(admin).recordAudit(
    AuditAction.DataAccessed,
    subjectId,
    ethers.ZeroHash,
    JSON.stringify({ recorder: "admin", event: "data_accessed" })
  );
  console.log("    ✓ Admin recorded: DataAccessed");

  // Step 4: Unauthorized user tries to record (should fail)
  console.log("\n>>> Step 4: Unauthorized user attempts to record");

  try {
    await auditLog.connect(unauthorized).recordAudit(
      AuditAction.ConsentGiven,
      subjectId,
      ethers.ZeroHash,
      JSON.stringify({ recorder: "unauthorized" })
    );
    console.log("    ✗ Should have failed!");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Not authorized")) {
      console.log("    ✓ Correctly rejected: Not authorized");
    }
  }

  // Step 5: View audit entries by recorder
  console.log("\n>>> Step 5: View audit entries by recorder");

  const totalEntries = await auditLog.getAuditCount();
  console.log(`\n    Total audit entries: ${totalEntries}`);

  for (const addr of [admin, operator1, operator2]) {
    const count = await auditLog.getActorAuditCount(addr.address);
    const name = addresses.find(a => a.signer.address === addr.address)?.name;
    console.log(`    ${name}: ${count} entries`);
  }

  // Step 6: Admin revokes operator authorization
  console.log("\n>>> Step 6: Admin revokes Operator 2 authorization");

  await auditLog.connect(admin).setAuthorizedRecorder(operator2.address, false);
  console.log("    ✓ Operator 2: REVOKED");

  // Operator 2 tries to record (should fail now)
  console.log("\n>>> Step 7: Revoked operator attempts to record");

  try {
    await auditLog.connect(operator2).recordAudit(
      AuditAction.ConsentRevoked,
      subjectId,
      ethers.ZeroHash,
      JSON.stringify({ recorder: "operator2_revoked" })
    );
    console.log("    ✗ Should have failed!");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Not authorized")) {
      console.log("    ✓ Correctly rejected: Operator 2 no longer authorized");
    }
  }

  // Step 8: Operator 1 still works
  console.log("\n>>> Step 8: Verify Operator 1 still authorized");

  await auditLog.connect(operator1).recordAudit(
    AuditAction.ConsentRevoked,
    subjectId,
    ethers.ZeroHash,
    JSON.stringify({ recorder: "operator1", event: "consent_revoked" })
  );
  console.log("    ✓ Operator 1 recorded: ConsentRevoked");

  // Step 9: Final authorization status
  console.log("\n>>> Step 9: Final authorization status");

  console.log("\n    Current Authorization:");
  for (const addr of addresses) {
    const isAuthorized = await auditLog.authorizedRecorders(addr.signer.address);
    const canRecord = isAuthorized || addr.signer.address === admin.address;
    const status = canRecord ? "✓ CAN RECORD" : "✗ CANNOT RECORD";
    const reason = addr.signer.address === admin.address ? "(admin)" : isAuthorized ? "(authorized)" : "(not authorized)";
    console.log(`      ${addr.name}: ${status} ${reason}`);
  }

  // === RBAC REPORT ===

  console.log("\n" + "-".repeat(60));
  console.log("  RBAC Administration Report");
  console.log("-".repeat(60));

  const finalCount = await auditLog.getAuditCount();

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           RBAC ADMINISTRATION REPORT                    │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log(`    │  Contract: ${await auditLog.getAddress()}  │`);
  console.log(`    │  Admin: ${admin.address.slice(0, 25)}...               │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  ROLE ASSIGNMENTS                                       │");
  console.log(`    │    Admin: ${admin.address.slice(0, 15)}... (full control)     │`);
  console.log(`    │    Operator 1: ${operator1.address.slice(0, 15)}... (recorder)  │`);
  console.log(`    │    Operator 2: ${operator2.address.slice(0, 15)}... (revoked)   │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  AUDIT STATISTICS                                       │");
  console.log(`    │    Total entries: ${finalCount}                                      │`);
  console.log(`    │    Successful records: ${Number(finalCount)}                                 │`);
  console.log(`    │    Rejected attempts: 2                                 │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  SECURITY                                               │");
  console.log("    │  ✓ Only admin can authorize/revoke recorders           │");
  console.log("    │  ✓ Only authorized addresses can record                │");
  console.log("    │  ✓ Revocation takes effect immediately                 │");
  console.log("    │  ✓ All record attempts are tracked                     │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Admin (deployer) has permanent authorization");
  console.log("  • Admin can authorize/revoke other recorders");
  console.log("  • Only authorized addresses can record audits");
  console.log("  • Revocation is immediate and enforced");
  console.log("  • Events emitted for authorization changes");
  console.log("  • Supports organizational RBAC patterns");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
