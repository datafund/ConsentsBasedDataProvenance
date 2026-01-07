/**
 * Example: Transaction Provenance
 * Scenario: Financial Services
 * Persona: Developers, Compliance Officers, Auditors
 *
 * This example demonstrates:
 * - Data transformation tracking through transaction lifecycle
 * - Transaction state management
 * - Complete lineage for regulatory compliance
 * - Multi-stage processing audit
 *
 * Scenario:
 * Transaction processing pipeline:
 * 1. Transaction initiated
 * 2. Transaction verified
 * 3. Transaction processed
 * 4. Transaction settled
 * Each stage creates a transformation record.
 *
 * Run with:
 * npx hardhat run examples/03-financial-services/03-transaction-provenance.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Financial Services Example: Transaction Provenance");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up transaction provenance scenario...\n");

  const [deployer, sender, receiver, verifier, processor, settler] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Sender:     ${sender.address.slice(0, 10)}...`);
  console.log(`  Receiver:   ${receiver.address.slice(0, 10)}...`);
  console.log(`  Verifier:   ${verifier.address.slice(0, 10)}...`);
  console.log(`  Processor:  ${processor.address.slice(0, 10)}...`);
  console.log(`  Settler:    ${settler.address.slice(0, 10)}...`);

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

  // Define purpose
  const TX_PROCESSING = "transaction_processing";

  // All parties give consent for transaction processing
  await consentReceipt.connect(sender)["giveConsent(string)"](TX_PROCESSING);
  await consentReceipt.connect(verifier)["giveConsent(string)"](TX_PROCESSING);
  await consentReceipt.connect(processor)["giveConsent(string)"](TX_PROCESSING);
  await consentReceipt.connect(settler)["giveConsent(string)"](TX_PROCESSING);

  console.log("All parties have given consent for transaction processing.");

  // === SCENARIO ===

  // Transaction ID
  const txId = `TX-${Date.now()}`;
  const dataHashes: { stage: string; hash: string }[] = [];

  // Stage 1: Transaction Initiated
  console.log("\n>>> Stage 1: TRANSACTION INITIATED");

  const initiatedHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify({
      txId,
      stage: "initiated",
      sender: sender.address,
      receiver: receiver.address,
      amount: 10000,
      currency: "USD",
      ts: Date.now()
    })
  ));

  await integratedSystem.connect(sender).registerDataWithConsent(
    initiatedHash,
    "transaction_initiated",
    TX_PROCESSING
  );

  dataHashes.push({ stage: "INITIATED", hash: initiatedHash });

  console.log(`    ✓ Transaction initiated by sender`);
  console.log(`      TX ID: ${txId}`);
  console.log(`      Amount: $10,000`);
  console.log(`      Hash: ${initiatedHash.slice(0, 20)}...`);

  // Stage 2: Transaction Verified
  console.log("\n>>> Stage 2: TRANSACTION VERIFIED");

  const verifiedHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify({
      txId,
      stage: "verified",
      verifiedBy: verifier.address,
      amlCheck: "PASSED",
      sanctionsCheck: "PASSED",
      ts: Date.now() + 1
    })
  ));

  await integratedSystem.connect(verifier).transformDataWithConsent(
    initiatedHash,
    verifiedHash,
    "compliance_verification: AML + sanctions screening",
    TX_PROCESSING
  );

  dataHashes.push({ stage: "VERIFIED", hash: verifiedHash });

  console.log(`    ✓ Transaction verified by compliance`);
  console.log("      AML Check: PASSED");
  console.log("      Sanctions: PASSED");
  console.log(`      Hash: ${verifiedHash.slice(0, 20)}...`);

  // Stage 3: Transaction Processed
  console.log("\n>>> Stage 3: TRANSACTION PROCESSED");

  const processedHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify({
      txId,
      stage: "processed",
      processedBy: processor.address,
      feeApplied: 25,
      netAmount: 9975,
      ts: Date.now() + 2
    })
  ));

  await integratedSystem.connect(processor).transformDataWithConsent(
    verifiedHash,
    processedHash,
    "payment_processing: fee calculation and deduction",
    TX_PROCESSING
  );

  dataHashes.push({ stage: "PROCESSED", hash: processedHash });

  console.log(`    ✓ Transaction processed`);
  console.log("      Fee Applied: $25");
  console.log("      Net Amount: $9,975");
  console.log(`      Hash: ${processedHash.slice(0, 20)}...`);

  // Stage 4: Transaction Settled
  console.log("\n>>> Stage 4: TRANSACTION SETTLED");

  const settledHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify({
      txId,
      stage: "settled",
      settledBy: settler.address,
      settlementRef: `SETTLE-${Date.now()}`,
      finalStatus: "COMPLETED",
      ts: Date.now() + 3
    })
  ));

  await integratedSystem.connect(settler).transformDataWithConsent(
    processedHash,
    settledHash,
    "settlement_finalization: funds transferred to receiver",
    TX_PROCESSING
  );

  dataHashes.push({ stage: "SETTLED", hash: settledHash });

  console.log(`    ✓ Transaction settled`);
  console.log("      Final Status: COMPLETED");
  console.log(`      Hash: ${settledHash.slice(0, 20)}...`);

  // === VIEW PROVENANCE ===

  console.log("\n" + "-".repeat(60));
  console.log("  Transaction Provenance Chain");
  console.log("-".repeat(60));

  console.log("\n    Complete Transaction Lineage:\n");
  console.log("    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │                 TRANSACTION LIFECYCLE                    │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  for (let i = 0; i < dataHashes.length; i++) {
    const { stage, hash } = dataHashes[i];
    const record = await dataProvenance.getDataRecord(hash);
    const statusMap = ["ACTIVE", "RESTRICTED", "DELETED"];

    const connector = i < dataHashes.length - 1 ? "│" : " ";
    const arrow = i < dataHashes.length - 1 ? "↓" : "";

    console.log(`    ┌─ Stage: ${stage}`);
    console.log(`    │  Hash: ${hash.slice(0, 30)}...`);
    console.log(`    │  Type: ${record.dataType}`);
    console.log(`    │  Owner: ${record.owner.slice(0, 10)}...`);
    console.log(`    │  Status: ${statusMap[record.status]}`);

    if (record.transformations.length > 0) {
      console.log(`    │  Transformation: ${record.transformations[0]}`);
    }

    if (i < dataHashes.length - 1) {
      console.log("    │");
      console.log("    └──────────────────────────────────────────────────────────");
      console.log("                              ↓");
    } else {
      console.log("    │");
      console.log("    └──────────────────────────────────────────────────────────");
    }
  }

  // === AUDIT SUMMARY ===

  console.log("\n" + "-".repeat(60));
  console.log("  Regulatory Audit Summary");
  console.log("-".repeat(60));

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           TRANSACTION AUDIT TRAIL                       │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log(`    │  Transaction ID: ${txId}                    │`);
  console.log(`    │  Total Stages: ${dataHashes.length}                                        │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  TRANSFORMATION CHAIN                                   │");

  for (let i = 0; i < dataHashes.length; i++) {
    const record = await dataProvenance.getDataRecord(dataHashes[i].hash);
    if (record.transformations.length > 0) {
      const transform = record.transformations[0].length > 40
        ? record.transformations[0].slice(0, 40) + "..."
        : record.transformations[0];
      console.log(`    │  ${i + 1}. ${transform}`);
    } else {
      console.log(`    │  ${i + 1}. [Initial record]`);
    }
  }

  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  COMPLIANCE CHECK                                       │");
  console.log("    │  ✓ All transformations recorded                        │");
  console.log("    │  ✓ Complete chain from initiation to settlement        │");
  console.log("    │  ✓ Each party identified and consented                 │");
  console.log("    │  ✓ Timestamps immutably recorded                       │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Each transaction stage creates a provenance record");
  console.log("  • Transformations link stages together (parent → child)");
  console.log("  • Complete audit trail from initiation to settlement");
  console.log("  • Each processor/verifier is recorded as data owner");
  console.log("  • Supports SOX 404 and regulatory reporting requirements");
  console.log("  • Immutable blockchain timestamps for compliance");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
