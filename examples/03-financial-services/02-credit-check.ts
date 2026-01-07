/**
 * Example: Credit Check
 * Scenario: Financial Services
 * Persona: Customers, Banks, Credit Bureaus, Compliance Officers
 *
 * This example demonstrates:
 * - Third-party data sharing consent
 * - Access delegation to credit bureau
 * - Cross-organization audit trail
 * - Consent verification before data access
 *
 * Scenario:
 * Loan application workflow:
 * 1. Customer applies for loan with bank
 * 2. Customer consents to credit check (third-party)
 * 3. Bank registers application data
 * 4. Credit bureau accesses customer data
 * 5. All access logged for audit
 *
 * Run with:
 * npx hardhat run examples/03-financial-services/02-credit-check.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Financial Services Example: Credit Check");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up credit check scenario...\n");

  const [deployer, customer, bank, creditBureau, analyst] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Customer (Bob):    ${customer.address.slice(0, 10)}...`);
  console.log(`  Bank:              ${bank.address.slice(0, 10)}...`);
  console.log(`  Credit Bureau:     ${creditBureau.address.slice(0, 10)}...`);
  console.log(`  Risk Analyst:      ${analyst.address.slice(0, 10)}...`);

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
  const CREDIT_CHECK = "credit_check_third_party";
  const LOAN_APPLICATION = "loan_application";

  // Get current time
  const block = await ethers.provider.getBlock("latest");
  const currentTime = block!.timestamp;

  // === SCENARIO ===

  // Step 1: Customer applies for a loan
  console.log("\n>>> Step 1: Customer applies for a loan");
  console.log("    Customer initiates loan application with the bank.\n");

  // Customer gives consent for loan application
  await consentReceipt.connect(customer)["giveConsent(string)"](LOAN_APPLICATION);
  console.log("    ✓ Consent given for loan application");

  // Create loan application data
  const applicationHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify({
      type: "loan_application",
      customerId: customer.address,
      amount: 50000,
      term: 36,
      ts: Date.now()
    })
  ));

  // Register application data
  await integratedSystem.connect(customer).registerDataWithConsent(
    applicationHash,
    "loan_application",
    LOAN_APPLICATION
  );

  console.log(`    ✓ Loan application registered`);
  console.log(`      Hash: ${applicationHash.slice(0, 20)}...`);

  // Step 2: Customer consents to third-party credit check
  console.log("\n>>> Step 2: Customer consents to third-party credit check");
  console.log("    Required for credit scoring - data will be shared with bureau.\n");

  const thirtyDays = 30 * 24 * 60 * 60;
  const creditCheckExpiry = currentTime + thirtyDays;

  await consentReceipt.connect(customer)["giveConsent(string,uint256)"](
    CREDIT_CHECK,
    creditCheckExpiry
  );

  console.log("    ✓ Credit check consent given");
  console.log(`      Purpose: ${CREDIT_CHECK}`);
  console.log(`      Expires: ${new Date(creditCheckExpiry * 1000).toLocaleDateString()}`);
  console.log("      Third-party: Credit Bureau authorized");

  // Step 3: Bank registers customer credit data
  console.log("\n>>> Step 3: Bank prepares credit data for bureau");

  // Customer financial data for credit check
  const creditDataHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify({
      type: "credit_profile",
      customerId: customer.address,
      income: "verified",
      existingDebts: "checked",
      ts: Date.now() + 1
    })
  ));

  await integratedSystem.connect(customer).registerDataWithConsent(
    creditDataHash,
    "credit_profile",
    CREDIT_CHECK
  );

  console.log(`    ✓ Credit profile data registered`);
  console.log(`      Hash: ${creditDataHash.slice(0, 20)}...`);

  // Step 4: Verify consent before credit bureau access
  console.log("\n>>> Step 4: Verify consent before credit bureau access");

  const hasConsent = await consentReceipt.getConsentStatus(customer.address, CREDIT_CHECK);
  console.log(`    Customer consent for '${CREDIT_CHECK}': ${hasConsent ? "VALID" : "INVALID"}`);

  if (!hasConsent) {
    console.log("    ✗ Cannot proceed - no consent for credit check!");
    return;
  }

  // Step 5: Credit bureau accesses data
  console.log("\n>>> Step 5: Credit bureau accesses customer data");
  console.log("    Bureau queries data after consent verification.\n");

  // Credit bureau gives its own consent (representing its data handling policy)
  await consentReceipt.connect(creditBureau)["giveConsent(string)"](CREDIT_CHECK);

  // Bureau accesses the credit data
  await integratedSystem.connect(creditBureau).accessDataWithConsent(
    creditDataHash,
    CREDIT_CHECK
  );

  console.log("    ✓ Credit bureau accessed customer credit profile");

  // Verify access was recorded
  const hasAccessed = await dataProvenance.hasAddressAccessed(creditDataHash, creditBureau.address);
  console.log(`    Access recorded: ${hasAccessed}`);

  // Step 6: Bureau generates credit score (data transformation)
  console.log("\n>>> Step 6: Credit bureau generates credit score");

  const creditScoreHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify({
      type: "credit_score",
      customerId: customer.address,
      score: 750,
      grade: "A",
      generatedBy: creditBureau.address,
      ts: Date.now() + 2
    })
  ));

  // Credit bureau needs consent for its data handling
  await integratedSystem.connect(creditBureau).transformDataWithConsent(
    creditDataHash,
    creditScoreHash,
    "credit_scoring_algorithm: profile → score",
    CREDIT_CHECK
  );

  console.log("    ✓ Credit score generated");
  console.log(`      Score Hash: ${creditScoreHash.slice(0, 20)}...`);
  console.log("      Transformation: credit_scoring_algorithm");

  // Step 7: Bank analyst accesses credit score
  console.log("\n>>> Step 7: Bank analyst reviews credit score");

  // Analyst needs consent
  await consentReceipt.connect(analyst)["giveConsent(string)"](CREDIT_CHECK);

  await integratedSystem.connect(analyst).accessDataWithConsent(
    creditScoreHash,
    CREDIT_CHECK
  );

  console.log("    ✓ Risk analyst accessed credit score");

  // Step 8: View data provenance chain
  console.log("\n>>> Step 8: View complete data provenance chain");

  const creditProfileRecord = await dataProvenance.getDataRecord(creditDataHash);
  const creditScoreRecord = await dataProvenance.getDataRecord(creditScoreHash);

  console.log("\n    Data Lineage:");
  console.log("    ─────────────────────────────────────────────────────");
  console.log("    ┌─ Customer Credit Profile");
  console.log(`    │   Hash: ${creditDataHash.slice(0, 20)}...`);
  console.log(`    │   Owner: ${creditProfileRecord.owner.slice(0, 10)}... (Customer)`);
  console.log(`    │   Accessors: ${creditProfileRecord.accessors.length}`);
  console.log("    │");
  console.log("    │   [TRANSFORMATION: credit_scoring_algorithm]");
  console.log("    │   By: Credit Bureau");
  console.log("    │");
  console.log("    └─► Credit Score Report");
  console.log(`        Hash: ${creditScoreHash.slice(0, 20)}...`);
  console.log(`        Owner: ${creditScoreRecord.owner.slice(0, 10)}... (Credit Bureau)`);
  console.log(`        Accessors: ${creditScoreRecord.accessors.length}`);

  // Step 9: Audit trail for compliance
  console.log("\n>>> Step 9: Generate audit summary");

  // Get all customer data
  const customerData = await integratedSystem.getUserRegisteredData(customer.address);

  console.log("\n    ┌─────────────────────────────────────────────────────┐");
  console.log("    │           CREDIT CHECK AUDIT SUMMARY                │");
  console.log("    ├─────────────────────────────────────────────────────┤");
  console.log(`    │  Customer: ${customer.address.slice(0, 20)}...       │`);
  console.log(`    │  Data Records: ${customerData.length}                                     │`);
  console.log("    ├─────────────────────────────────────────────────────┤");
  console.log("    │  CONSENT STATUS                                     │");
  console.log(`    │  • Loan Application: ${await consentReceipt.getConsentStatus(customer.address, LOAN_APPLICATION) ? "VALID" : "EXPIRED"}                           │`);
  console.log(`    │  • Credit Check: ${await consentReceipt.getConsentStatus(customer.address, CREDIT_CHECK) ? "VALID" : "EXPIRED"}                               │`);
  console.log("    ├─────────────────────────────────────────────────────┤");
  console.log("    │  DATA ACCESS                                        │");
  console.log(`    │  • Credit Bureau accessed profile: ${await dataProvenance.hasAddressAccessed(creditDataHash, creditBureau.address) ? "YES" : "NO"}             │`);
  console.log(`    │  • Risk Analyst accessed score: ${await dataProvenance.hasAddressAccessed(creditScoreHash, analyst.address) ? "YES" : "NO"}                │`);
  console.log("    └─────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Third-party credit check requires explicit consent");
  console.log("  • Consent has limited duration (30 days)");
  console.log("  • Data transformations (scoring) are tracked");
  console.log("  • Cross-organization data flow is auditable");
  console.log("  • Every accessor is recorded in provenance");
  console.log("  • Complete lineage from profile to score");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
