/**
 * Example: Access Level Management
 * Scenario: Advanced Patterns
 * Persona: Developers, Data Managers
 *
 * This example demonstrates:
 * - DataAccessControl contract usage
 * - Tiered access levels (Read, Transform, Full)
 * - Time-bounded access grants
 * - Access verification and modification
 *
 * Scenario:
 * Data access management:
 * 1. Data owner registers data
 * 2. Grants different access levels to different parties
 * 3. Verifies access before operations
 * 4. Modifies and revokes access
 *
 * Run with:
 * npx hardhat run examples/07-advanced-patterns/05-access-level-management.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Advanced Pattern: Access Level Management");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up access level management scenario...\n");

  const [deployer, dataOwner, viewer, processor, fullAccess] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Data Owner:    ${dataOwner.address.slice(0, 10)}...`);
  console.log(`  Viewer:        ${viewer.address.slice(0, 10)}...`);
  console.log(`  Processor:     ${processor.address.slice(0, 10)}...`);
  console.log(`  Full Access:   ${fullAccess.address.slice(0, 10)}...`);

  // Deploy DataProvenance
  const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
  const dataProvenance = await DataProvenanceFactory.deploy();
  await dataProvenance.waitForDeployment();

  // Deploy DataAccessControl
  const AccessControlFactory = await ethers.getContractFactory("DataAccessControl");
  const accessControl = await AccessControlFactory.deploy(await dataProvenance.getAddress());
  await accessControl.waitForDeployment();

  console.log(`\nDataProvenance deployed at: ${await dataProvenance.getAddress()}`);
  console.log(`DataAccessControl deployed at: ${await accessControl.getAddress()}`);

  // Access levels
  const AccessLevel = {
    None: 0,
    Read: 1,
    Transform: 2,
    Full: 3
  };

  const AccessLevelNames = ["None", "Read", "Transform", "Full"];

  // Get current time
  const block = await ethers.provider.getBlock("latest");
  const currentTime = block!.timestamp;

  // === SCENARIO ===

  // Step 1: Data owner registers data
  console.log("\n>>> Step 1: Data owner registers sensitive data");

  const dataHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify({
      type: "sensitive_dataset",
      owner: dataOwner.address,
      created: Date.now()
    })
  ));

  await dataProvenance.connect(dataOwner).registerData(dataHash, "sensitive_dataset");

  console.log(`    ✓ Data registered`);
  console.log(`      Hash: ${dataHash.slice(0, 20)}...`);
  console.log(`      Owner: ${dataOwner.address.slice(0, 10)}...`);

  // Step 2: Grant different access levels
  console.log("\n>>> Step 2: Grant different access levels");

  const oneMonth = 30 * 24 * 60 * 60;
  const threeMonths = 90 * 24 * 60 * 60;
  const sixMonths = 180 * 24 * 60 * 60;

  // Grant READ to viewer
  const viewerExpiry = currentTime + oneMonth;
  await accessControl.connect(dataOwner).grantAccess(
    dataHash,
    viewer.address,
    AccessLevel.Read,
    viewerExpiry,
    ethers.ZeroHash // consent receipt ID (optional)
  );
  console.log(`    ✓ Viewer: READ access (1 month)`);

  // Grant TRANSFORM to processor
  const processorExpiry = currentTime + threeMonths;
  await accessControl.connect(dataOwner).grantAccess(
    dataHash,
    processor.address,
    AccessLevel.Transform,
    processorExpiry,
    ethers.ZeroHash
  );
  console.log(`    ✓ Processor: TRANSFORM access (3 months)`);

  // Grant FULL to fullAccess
  const fullAccessExpiry = currentTime + sixMonths;
  await accessControl.connect(dataOwner).grantAccess(
    dataHash,
    fullAccess.address,
    AccessLevel.Full,
    fullAccessExpiry,
    ethers.ZeroHash
  );
  console.log(`    ✓ Full Access: FULL access (6 months)`);

  // Step 3: View all grantees
  console.log("\n>>> Step 3: View all access grants");

  const grantees = await accessControl.getDataGrantees(dataHash);

  console.log(`\n    Data has ${grantees.length} grantees:`);
  console.log("    ─────────────────────────────────────────────────────");

  for (const grantee of grantees) {
    const grant = await accessControl.getAccessGrant(dataHash, grantee);
    const expiry = new Date(Number(grant.validUntil) * 1000).toLocaleDateString();
    const level = AccessLevelNames[grant.level];

    console.log(`\n    Grantee: ${grantee.slice(0, 10)}...`);
    console.log(`      Level: ${level}`);
    console.log(`      Expires: ${expiry}`);
    console.log(`      Active: ${grant.isActive}`);
  }

  // Step 4: Check access for different operations
  console.log("\n>>> Step 4: Check access for different operations");

  const parties = [
    { signer: viewer, name: "Viewer" },
    { signer: processor, name: "Processor" },
    { signer: fullAccess, name: "Full Access" }
  ];

  const operations = [
    { level: AccessLevel.Read, name: "Read" },
    { level: AccessLevel.Transform, name: "Transform" },
    { level: AccessLevel.Full, name: "Full" }
  ];

  console.log("\n    Access Matrix:");
  console.log("    ┌──────────────┬────────┬───────────┬────────┐");
  console.log("    │              │  Read  │ Transform │  Full  │");
  console.log("    ├──────────────┼────────┼───────────┼────────┤");

  for (const party of parties) {
    const results = [];
    for (const op of operations) {
      const canAccess = await accessControl.checkAccess(dataHash, party.signer.address, op.level);
      results.push(canAccess ? "  ✓   " : "  ✗   ");
    }
    const padding = " ".repeat(Math.max(0, 12 - party.name.length));
    console.log(`    │ ${party.name}${padding} │${results[0]}│${results[1]}  │${results[2]}│`);
  }

  console.log("    └──────────────┴────────┴───────────┴────────┘");

  // Step 5: Upgrade processor to FULL access
  console.log("\n>>> Step 5: Upgrade processor to FULL access");

  await accessControl.connect(dataOwner).changeAccessLevel(
    dataHash,
    processor.address,
    AccessLevel.Full
  );

  console.log("    ✓ Processor upgraded: TRANSFORM → FULL");

  // Verify upgrade
  const processorGrant = await accessControl.getAccessGrant(dataHash, processor.address);
  console.log(`    New level: ${AccessLevelNames[processorGrant.level]}`);

  // Step 6: Revoke viewer access
  console.log("\n>>> Step 6: Revoke viewer access");

  await accessControl.connect(dataOwner).revokeAccess(dataHash, viewer.address);
  console.log("    ✓ Viewer access: REVOKED");

  // Verify revocation
  const viewerValid = await accessControl.isAccessValid(dataHash, viewer.address);
  console.log(`    Viewer can access: ${viewerValid ? "YES" : "NO"}`);

  // Step 7: View user's accessible data
  console.log("\n>>> Step 7: View accessible data per user");

  for (const party of parties) {
    const accessibleData = await accessControl.getUserAccessibleData(party.signer.address);
    const valid = await accessControl.isAccessValid(dataHash, party.signer.address);
    console.log(`    ${party.name}: ${accessibleData.length} data record(s), Currently valid: ${valid}`);
  }

  // Step 8: Final access summary
  console.log("\n>>> Step 8: Final access summary");

  console.log("\n    Final Access State:");
  console.log("    ─────────────────────────────────────────────────────");

  for (const party of parties) {
    const grant = await accessControl.getAccessGrant(dataHash, party.signer.address);
    const valid = await accessControl.isAccessValid(dataHash, party.signer.address);

    let status;
    if (!grant.isActive) {
      status = "REVOKED";
    } else if (valid) {
      status = AccessLevelNames[grant.level];
    } else {
      status = "EXPIRED";
    }

    console.log(`    ${party.name}: ${status}`);
  }

  // === ACCESS CONTROL REPORT ===

  console.log("\n" + "-".repeat(60));
  console.log("  Access Control Report");
  console.log("-".repeat(60));

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           DATA ACCESS CONTROL REPORT                    │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log(`    │  Data: ${dataHash.slice(0, 35)}...     │`);
  console.log(`    │  Owner: ${dataOwner.address.slice(0, 25)}...               │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  ACCESS LEVELS                                          │");
  console.log("    │    None (0): No access                                  │");
  console.log("    │    Read (1): View data only                             │");
  console.log("    │    Transform (2): Read + process/modify                 │");
  console.log("    │    Full (3): Complete control                           │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  CURRENT GRANTS                                         │");
  console.log("    │    Viewer: REVOKED                                      │");
  console.log("    │    Processor: FULL (upgraded)                           │");
  console.log("    │    Full Access: FULL                                    │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  SECURITY                                               │");
  console.log("    │  ✓ Only owner can grant/revoke access                  │");
  console.log("    │  ✓ Access levels are hierarchical                      │");
  console.log("    │  ✓ Time bounds enforced                                │");
  console.log("    │  ✓ Maximum 2-year duration                             │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Four access levels: None, Read, Transform, Full");
  console.log("  • Higher levels include lower level permissions");
  console.log("  • Access grants have expiration dates");
  console.log("  • Owner can change levels or revoke access");
  console.log("  • checkAccess verifies minimum required level");
  console.log("  • Maximum 2-year grant duration for security");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
