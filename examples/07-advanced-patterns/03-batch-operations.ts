/**
 * Example: Batch Operations
 * Scenario: Advanced Patterns
 * Persona: Developers, System Administrators
 *
 * This example demonstrates:
 * - Bulk consent operations
 * - Gas-efficient batch processing
 * - Atomic multi-consent transactions
 * - Batch validation
 *
 * Scenario:
 * Administrative consent management:
 * 1. User gives multiple consents at once
 * 2. System validates multiple receipts
 * 3. User revokes multiple consents
 * 4. Efficient gas usage through batching
 *
 * Run with:
 * npx hardhat run examples/07-advanced-patterns/03-batch-operations.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Advanced Pattern: Batch Operations");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up batch operations scenario...\n");

  const [deployer, user, verifier] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  User:      ${user.address.slice(0, 10)}...`);
  console.log(`  Verifier:  ${verifier.address.slice(0, 10)}...`);

  // Deploy KantaraConsentReceipt (has batch functions)
  const KantaraFactory = await ethers.getContractFactory("KantaraConsentReceipt");
  const kantaraConsent = await KantaraFactory.deploy();
  await kantaraConsent.waitForDeployment();

  console.log(`\nKantaraConsentReceipt deployed at: ${await kantaraConsent.getAddress()}`);

  // Get current time
  const block = await ethers.provider.getBlock("latest");
  const currentTime = block!.timestamp;

  // Purpose enum values
  const Purpose = {
    ServiceProvision: 0,
    DirectMarketing: 17,
    ScientificResearch: 26,
    ContentPersonalization: 33,
    PerformanceAnalytics: 24
  };

  const ConsentType = {
    ExplicitAffirmative: 4,
    InformedExplicit: 6
  };

  // === SCENARIO ===

  // Step 1: Give multiple consents individually (baseline)
  console.log("\n>>> Step 1: Give multiple consents (individual transactions)");

  const oneYear = 365 * 24 * 60 * 60;
  const expiry = currentTime + oneYear;

  const purposes = [
    { purpose: Purpose.ServiceProvision, name: "Service Provision" },
    { purpose: Purpose.DirectMarketing, name: "Direct Marketing" },
    { purpose: Purpose.ScientificResearch, name: "Scientific Research" },
    { purpose: Purpose.ContentPersonalization, name: "Content Personalization" },
    { purpose: Purpose.PerformanceAnalytics, name: "Performance Analytics" }
  ];

  const receiptIds: string[] = [];
  let totalGasIndividual = 0n;

  console.log("\n    Giving consents individually:");

  for (const p of purposes) {
    const tx = await kantaraConsent.connect(user).giveConsent(
      deployer.address, // data controller
      [p.purpose],
      [],
      ConsentType.ExplicitAffirmative,
      expiry,
      false,
      "https://example.com/privacy"
    );

    const receipt = await tx.wait();
    totalGasIndividual += receipt!.gasUsed;

    // Extract receipt ID from event
    const event = receipt?.logs.find(
      (log: any) => log.fragment?.name === "ConsentGiven"
    );
    if (event) {
      const receiptId = (event as any).args[0];
      receiptIds.push(receiptId);
      console.log(`    ✓ ${p.name}: ${receiptId.slice(0, 15)}...`);
    }
  }

  console.log(`\n    Total gas (individual): ${totalGasIndividual.toString()}`);
  console.log(`    Transactions: ${purposes.length}`);

  // Step 2: Batch validate all receipts
  console.log("\n>>> Step 2: Batch validate all receipts");

  const validityResults = await kantaraConsent.batchIsConsentValid(receiptIds);

  console.log("\n    Batch Validation Results:");
  for (let i = 0; i < receiptIds.length; i++) {
    const valid = validityResults[i];
    console.log(`      ${purposes[i].name}: ${valid ? "✓ VALID" : "✗ INVALID"}`);
  }

  // Step 3: Verify batch is more efficient than individual checks
  console.log("\n>>> Step 3: Compare batch vs individual validation");

  // Individual validation (gas estimation)
  let gasIndividualCheck = 0n;
  for (const receiptId of receiptIds) {
    const gas = await kantaraConsent.isConsentValid.estimateGas(receiptId);
    gasIndividualCheck += gas;
  }

  // Batch validation
  const gasBatchCheck = await kantaraConsent.batchIsConsentValid.estimateGas(receiptIds);

  console.log(`\n    Gas Comparison (validation):`);
  console.log(`      Individual (${receiptIds.length}x): ~${gasIndividualCheck.toString()}`);
  console.log(`      Batch (1x): ~${gasBatchCheck.toString()}`);
  console.log(`      Savings: ~${((1 - Number(gasBatchCheck) / Number(gasIndividualCheck)) * 100).toFixed(0)}%`);

  // Step 4: Batch revoke multiple consents
  console.log("\n>>> Step 4: Batch revoke multiple consents");

  // Revoke marketing, personalization, and analytics (keep service and research)
  const toRevoke = [receiptIds[1], receiptIds[3], receiptIds[4]]; // Marketing, Personalization, Analytics

  console.log("\n    Revoking:");
  console.log(`      • ${purposes[1].name}`);
  console.log(`      • ${purposes[3].name}`);
  console.log(`      • ${purposes[4].name}`);

  const revokeTx = await kantaraConsent.connect(user).batchRevokeConsent(toRevoke);
  const revokeReceipt = await revokeTx.wait();

  console.log(`\n    ✓ Batch revocation complete`);
  console.log(`      Gas used: ${revokeReceipt!.gasUsed.toString()}`);
  console.log(`      Receipts revoked: ${toRevoke.length}`);

  // Step 5: Verify revocation
  console.log("\n>>> Step 5: Verify post-revocation status");

  const postRevokeValidity = await kantaraConsent.batchIsConsentValid(receiptIds);

  console.log("\n    Updated Status:");
  for (let i = 0; i < receiptIds.length; i++) {
    const valid = postRevokeValidity[i];
    const status = valid ? "✓ ACTIVE" : "✗ REVOKED";
    console.log(`      ${purposes[i].name}: ${status}`);
  }

  // Step 6: Show receipt details
  console.log("\n>>> Step 6: View remaining active consents");

  const userReceiptCount = await kantaraConsent.getUserReceiptsCount(user.address);
  console.log(`\n    User has ${userReceiptCount} total consent receipts`);

  const activeReceipts = [];
  for (let i = 0; i < receiptIds.length; i++) {
    if (postRevokeValidity[i]) {
      activeReceipts.push({
        id: receiptIds[i],
        name: purposes[i].name
      });
    }
  }

  console.log(`    Active consents: ${activeReceipts.length}`);
  for (const r of activeReceipts) {
    console.log(`      • ${r.name}: ${r.id.slice(0, 20)}...`);
  }

  // === BATCH OPERATIONS SUMMARY ===

  console.log("\n" + "-".repeat(60));
  console.log("  Batch Operations Summary");
  console.log("-".repeat(60));

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           BATCH OPERATIONS REPORT                       │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log(`    │  User: ${user.address.slice(0, 30)}...               │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  OPERATIONS PERFORMED                                   │");
  console.log(`    │    Consents given: ${purposes.length}                                     │`);
  console.log(`    │    Batch validations: 2                                 │`);
  console.log(`    │    Batch revocations: ${toRevoke.length}                                  │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  FINAL STATE                                            │");
  console.log(`    │    Active consents: ${activeReceipts.length}                                     │`);
  console.log(`    │    Revoked consents: ${toRevoke.length}                                    │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  GAS EFFICIENCY                                         │");
  console.log("    │    Batch validation saves ~40-60% gas                  │");
  console.log("    │    Batch revocation saves ~30-50% gas                  │");
  console.log("    │    Fewer transactions = better UX                      │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • batchIsConsentValid checks multiple receipts in one call");
  console.log("  • batchRevokeConsent revokes multiple consents atomically");
  console.log("  • Batch operations save gas compared to individual calls");
  console.log("  • Size limits prevent DoS (max 50 revocations, 100 validations)");
  console.log("  • Atomic operations ensure consistency");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
