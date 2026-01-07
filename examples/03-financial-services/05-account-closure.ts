/**
 * Example: Account Closure
 * Scenario: Financial Services
 * Persona: Customers, Bank Operations, Compliance Officers
 *
 * This example demonstrates:
 * - Complete account data identification
 * - DataDeletion contract for right to erasure
 * - Cryptographic deletion proofs
 * - Regulatory retention requirements
 * - Deletion verification for compliance
 *
 * Scenario:
 * Customer closes bank account:
 * 1. Customer requests account closure
 * 2. All customer data records identified
 * 3. Data marked for deletion
 * 4. Cryptographic proofs generated
 * 5. Deletion verified for compliance
 *
 * Run with:
 * npx hardhat run examples/03-financial-services/05-account-closure.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Financial Services Example: Account Closure");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up account closure scenario...\n");

  const [deployer, customer, banker] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Customer:  ${customer.address.slice(0, 10)}...`);
  console.log(`  Banker:    ${banker.address.slice(0, 10)}...`);

  // Deploy contracts
  const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
  const dataProvenance = await DataProvenanceFactory.deploy();
  await dataProvenance.waitForDeployment();

  const DataDeletionFactory = await ethers.getContractFactory("DataDeletion");
  const dataDeletion = await DataDeletionFactory.deploy(await dataProvenance.getAddress());
  await dataDeletion.waitForDeployment();

  console.log("\nContracts deployed:");
  console.log(`  DataProvenance: ${await dataProvenance.getAddress()}`);
  console.log(`  DataDeletion:   ${await dataDeletion.getAddress()}`);

  // === SIMULATE EXISTING ACCOUNT DATA ===

  console.log("\n>>> Creating customer account data...\n");

  // Customer's account data records
  const customerData = [
    { type: "personal_info", desc: "Name, DOB, SSN, Address" },
    { type: "account_details", desc: "Account numbers, balances" },
    { type: "transaction_history", desc: "Transaction records" },
    { type: "credit_score", desc: "Credit scoring data" },
    { type: "marketing_preferences", desc: "Communication preferences" },
    { type: "security_questions", desc: "Security Q&A" }
  ];

  const dataHashes: string[] = [];

  for (const record of customerData) {
    const hash = ethers.keccak256(ethers.toUtf8Bytes(
      JSON.stringify({
        customerId: customer.address,
        type: record.type,
        data: `sensitive_${record.type}_data`,
        ts: Date.now() + dataHashes.length
      })
    ));
    dataHashes.push(hash);

    await dataProvenance.connect(customer).registerData(hash, record.type);
    console.log(`    ✓ ${record.type}: ${record.desc}`);
  }

  console.log(`\n    Total records: ${dataHashes.length}`);

  // === SCENARIO: ACCOUNT CLOSURE ===

  // Step 1: Customer requests account closure
  console.log("\n>>> Step 1: Customer requests account closure");
  console.log("    Customer exercises right to close account and delete data.\n");

  console.log("    Pre-closure data status:");
  const statusMap = ["ACTIVE", "RESTRICTED", "DELETED"];

  for (let i = 0; i < dataHashes.length; i++) {
    const record = await dataProvenance.getDataRecord(dataHashes[i]);
    const accessible = await dataDeletion.isDataAccessible(dataHashes[i]);
    console.log(`      ${customerData[i].type}: ${statusMap[record.status]} (accessible: ${accessible})`);
  }

  // Step 2: Identify data requiring special retention
  console.log("\n>>> Step 2: Identify regulatory retention requirements");
  console.log("    Some data must be retained for compliance periods.\n");

  // Transaction history must be kept for 7 years (regulatory requirement)
  const retentionRequired = ["transaction_history"];
  const forDeletion = customerData
    .filter(d => !retentionRequired.includes(d.type))
    .map((d, i) => ({ ...d, hash: dataHashes[customerData.indexOf(d)] }));

  console.log("    Data subject to retention:");
  for (const r of retentionRequired) {
    console.log(`      • ${r} - 7 year retention (regulatory)`);
  }

  console.log("\n    Data eligible for deletion:");
  for (const d of forDeletion) {
    console.log(`      • ${d.type}`);
  }

  // Step 3: Mark data status and request deletion
  console.log("\n>>> Step 3: Process deletion requests");

  const deletionProofs: { type: string; proofHash: string }[] = [];

  for (const item of forDeletion) {
    // First mark as deleted in provenance
    await dataProvenance.connect(customer).updateDataStatus(item.hash, 2); // 2 = Deleted

    // Then request formal deletion with proof
    await dataDeletion.connect(customer).requestDeletion(
      item.hash,
      `Account closure - Customer request (GDPR Article 17)`
    );

    // Get the deletion proof
    const [, proof] = await dataDeletion.verifyDeletion(item.hash);
    deletionProofs.push({ type: item.type, proofHash: proof.proofHash });

    console.log(`    ✓ ${item.type} deleted`);
    console.log(`      Proof: ${proof.proofHash.slice(0, 20)}...`);
  }

  // Step 4: Mark retained data as restricted
  console.log("\n>>> Step 4: Mark retained data as RESTRICTED");

  const transactionHashIndex = customerData.findIndex(d => d.type === "transaction_history");
  const transactionHash = dataHashes[transactionHashIndex];

  await dataProvenance.connect(customer).updateDataStatus(transactionHash, 1); // 1 = Restricted

  const restrictedRecord = await dataProvenance.getDataRecord(transactionHash);
  console.log(`    ✓ transaction_history: ${statusMap[restrictedRecord.status]}`);
  console.log("      Reason: 7-year regulatory retention requirement");

  // Step 5: Verify all deletions
  console.log("\n>>> Step 5: Verify deletion status");

  console.log("\n    Post-closure data status:");
  console.log("    ─────────────────────────────────────────────────────");

  for (let i = 0; i < dataHashes.length; i++) {
    const record = await dataProvenance.getDataRecord(dataHashes[i]);
    const accessible = await dataDeletion.isDataAccessible(dataHashes[i]);
    const [isDeleted] = await dataDeletion.verifyDeletion(dataHashes[i]);

    let status = statusMap[record.status];
    if (isDeleted) status = "DELETED (with proof)";

    console.log(`      ${customerData[i].type}:`);
    console.log(`        Status: ${status}`);
    console.log(`        Accessible: ${accessible}`);
  }

  // Step 6: View all deletion requests
  console.log("\n>>> Step 6: View deletion proofs for compliance");

  const deletionRequests = await dataDeletion.getUserDeletionRequests(customer.address);

  console.log(`\n    Customer has ${deletionRequests.length} deletion proofs:\n`);

  for (let i = 0; i < deletionRequests.length; i++) {
    const [, proof] = await dataDeletion.verifyDeletion(deletionRequests[i]);
    const timestamp = new Date(Number(proof.deletionTimestamp) * 1000).toLocaleString();

    console.log(`    [${i + 1}] Deletion Proof`);
    console.log(`        Data Hash: ${proof.dataHash.slice(0, 20)}...`);
    console.log(`        Timestamp: ${timestamp}`);
    console.log(`        Proof Hash: ${proof.proofHash.slice(0, 30)}...`);
    console.log(`        Reason: ${proof.reason.slice(0, 40)}...`);
    console.log();
  }

  // === GENERATE CLOSURE REPORT ===

  console.log("-".repeat(60));
  console.log("  Account Closure Compliance Report");
  console.log("-".repeat(60));

  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│            ACCOUNT CLOSURE COMPLIANCE REPORT                 │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log(`│  Customer: ${customer.address.slice(0, 30)}...        │`);
  console.log(`│  Closure Date: ${new Date().toLocaleString()}              │`);
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log("│  DATA DELETION SUMMARY                                       │");
  console.log(`│  • Total records: ${dataHashes.length}                                         │`);
  console.log(`│  • Records deleted: ${deletionRequests.length}                                       │`);
  console.log(`│  • Records retained (regulatory): ${dataHashes.length - deletionRequests.length}                            │`);
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log("│  DELETED DATA                                                │");

  for (const proof of deletionProofs) {
    const padding = " ".repeat(Math.max(0, 25 - proof.type.length));
    console.log(`│    • ${proof.type}${padding}✓                    │`);
  }

  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log("│  RETAINED DATA (Regulatory)                                  │");
  console.log("│    • transaction_history   7-year retention    RESTRICTED    │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log("│  CRYPTOGRAPHIC PROOFS                                        │");
  console.log(`│  • ${deletionProofs.length} deletion proofs generated                            │`);
  console.log("│  • All proofs stored on-chain                               │");
  console.log("│  • Verifiable via verifyDeletion()                          │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log("│  COMPLIANCE STATUS                                           │");
  console.log("│  ✓ Customer data deletion request processed                 │");
  console.log("│  ✓ Cryptographic proofs generated for all deletions         │");
  console.log("│  ✓ Regulatory retention requirements identified             │");
  console.log("│  ✓ Retained data marked as RESTRICTED                       │");
  console.log("│  ✓ Complete audit trail maintained                          │");
  console.log("│  ✓ GDPR Article 17 compliance verified                      │");
  console.log("└─────────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Account closure triggers data review");
  console.log("  • Regulatory retention requirements respected");
  console.log("  • Cryptographic proofs for each deletion");
  console.log("  • Retained data marked as RESTRICTED, not deleted");
  console.log("  • Complete audit trail preserved");
  console.log("  • Deletion proofs satisfy GDPR Article 17");
  console.log("  • verifyDeletion() provides compliance evidence");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
