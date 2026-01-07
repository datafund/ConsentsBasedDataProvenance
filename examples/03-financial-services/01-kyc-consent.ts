/**
 * Example: KYC Consent
 * Scenario: Financial Services
 * Persona: Customers, Bank Compliance, Developers
 *
 * This example demonstrates:
 * - KantaraConsentReceipt for formal consent documentation
 * - Multi-purpose consent for KYC requirements
 * - Mandatory vs optional consent handling
 * - Third-party disclosure consent
 *
 * Scenario:
 * Customer Bob applies for a bank account:
 * 1. Identity verification consent (mandatory)
 * 2. Background check consent (mandatory for compliance)
 * 3. Marketing consent (optional)
 * All consents are Kantara-compliant with full audit trail.
 *
 * Run with:
 * npx hardhat run examples/03-financial-services/01-kyc-consent.ts --network localhost
 */

import { ethers } from "hardhat";

// Purpose enum values matching the contract
const Purpose = {
  IdentityVerification: 12,      // Security and Safety
  RegulatoryCompliance: 74,      // Miscellaneous
  CreditScoring: 60,             // Financial Management
  DirectMarketing: 17,           // Marketing and Communications
  FraudPrevention: 11,           // Security and Safety
  AccountManagement: 3           // Core Business Functions
};

// ConsentType enum values
const ConsentType = {
  ExplicitAffirmative: 4,
  InformedExplicit: 6,
  DigitalConsent: 10,
  DoubleOptIn: 11
};

const PurposeNames: { [key: number]: string } = {
  3: "AccountManagement",
  11: "FraudPrevention",
  12: "IdentityVerification",
  17: "DirectMarketing",
  60: "CreditScoring",
  74: "RegulatoryCompliance"
};

const ConsentTypeNames: { [key: number]: string } = {
  4: "ExplicitAffirmative",
  6: "InformedExplicit",
  10: "DigitalConsent",
  11: "DoubleOptIn"
};

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Financial Services Example: KYC Consent");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up KYC consent scenario...\n");

  const [deployer, customer, bank, regulatoryBody] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Customer (Bob):     ${customer.address.slice(0, 10)}...`);
  console.log(`  Bank (Controller):  ${bank.address.slice(0, 10)}...`);
  console.log(`  Regulatory Body:    ${regulatoryBody.address.slice(0, 10)}...`);

  // Deploy KantaraConsentReceipt
  const KantaraFactory = await ethers.getContractFactory("KantaraConsentReceipt");
  const kantaraConsent = await KantaraFactory.deploy();
  await kantaraConsent.waitForDeployment();

  console.log(`\nKantaraConsentReceipt deployed at: ${await kantaraConsent.getAddress()}`);

  // Get current time for expiry calculations
  const block = await ethers.provider.getBlock("latest");
  const currentTime = block!.timestamp;

  // Define PI (Personal Information) categories
  const piCategories = [
    ethers.keccak256(ethers.toUtf8Bytes("full_name")),
    ethers.keccak256(ethers.toUtf8Bytes("date_of_birth")),
    ethers.keccak256(ethers.toUtf8Bytes("address")),
    ethers.keccak256(ethers.toUtf8Bytes("government_id")),
    ethers.keccak256(ethers.toUtf8Bytes("tax_id"))
  ];

  // === SCENARIO ===

  // Step 1: Customer gives mandatory KYC consent
  console.log("\n>>> Step 1: Customer gives MANDATORY KYC consent");
  console.log("    Required for account opening under KYC/AML regulations.\n");

  const twoYears = 2 * 365 * 24 * 60 * 60;
  const kycExpiry = currentTime + twoYears;

  const kycPurposes = [
    Purpose.IdentityVerification,
    Purpose.RegulatoryCompliance,
    Purpose.FraudPrevention,
    Purpose.AccountManagement
  ];

  const kycReceiptTx = await kantaraConsent.connect(customer).giveConsent(
    bank.address,                    // Data controller
    kycPurposes,                     // Purposes
    piCategories,                    // PI categories
    ConsentType.InformedExplicit,    // Consent type
    kycExpiry,                       // Expiry (2 years)
    false,                           // Third-party disclosure
    "https://bank.example/privacy"   // Policy URL
  );

  const kycReceipt = await kycReceiptTx.wait();
  const kycEvent = kycReceipt?.logs.find(
    (log: any) => log.fragment?.name === "ConsentGiven"
  );
  const kycReceiptId = kycEvent?.args?.[0];

  console.log("    ✓ KYC Consent recorded");
  console.log(`      Receipt ID: ${kycReceiptId.slice(0, 20)}...`);
  console.log(`      Consent Type: InformedExplicit`);
  console.log(`      Expires: ${new Date(kycExpiry * 1000).toLocaleDateString()}`);
  console.log("      Purposes:");
  for (const p of kycPurposes) {
    console.log(`        • ${PurposeNames[p]}`);
  }

  // Step 2: Customer gives consent for credit scoring (third-party)
  console.log("\n>>> Step 2: Customer consents to credit scoring");
  console.log("    Required for loan eligibility - involves third-party credit bureau.\n");

  const oneYear = 365 * 24 * 60 * 60;
  const creditExpiry = currentTime + oneYear;

  const creditPurposes = [Purpose.CreditScoring];

  const creditReceiptTx = await kantaraConsent.connect(customer).giveConsent(
    bank.address,
    creditPurposes,
    [piCategories[0], piCategories[3]], // Name and government ID only
    ConsentType.ExplicitAffirmative,
    creditExpiry,
    true,                               // Third-party disclosure allowed
    "https://bank.example/credit-check-policy"
  );

  const creditReceipt = await creditReceiptTx.wait();
  const creditEvent = creditReceipt?.logs.find(
    (log: any) => log.fragment?.name === "ConsentGiven"
  );
  const creditReceiptId = creditEvent?.args?.[0];

  console.log("    ✓ Credit scoring consent recorded");
  console.log(`      Receipt ID: ${creditReceiptId.slice(0, 20)}...`);
  console.log(`      Third-party disclosure: ALLOWED`);
  console.log(`      Expires: ${new Date(creditExpiry * 1000).toLocaleDateString()}`);

  // Step 3: Customer optionally consents to marketing
  console.log("\n>>> Step 3: Customer OPTS INTO marketing (optional)");
  console.log("    Customer chooses to receive promotional offers.\n");

  const sixMonths = 180 * 24 * 60 * 60;
  const marketingExpiry = currentTime + sixMonths;

  const marketingReceiptTx = await kantaraConsent.connect(customer).giveConsent(
    bank.address,
    [Purpose.DirectMarketing],
    [piCategories[0], piCategories[2]], // Name and address
    ConsentType.DoubleOptIn,
    marketingExpiry,
    false,
    "https://bank.example/marketing-preferences"
  );

  const marketingReceipt = await marketingReceiptTx.wait();
  const marketingEvent = marketingReceipt?.logs.find(
    (log: any) => log.fragment?.name === "ConsentGiven"
  );
  const marketingReceiptId = marketingEvent?.args?.[0];

  console.log("    ✓ Marketing consent recorded (OPTIONAL)");
  console.log(`      Receipt ID: ${marketingReceiptId.slice(0, 20)}...`);
  console.log(`      Consent Type: DoubleOptIn`);
  console.log(`      Expires: ${new Date(marketingExpiry * 1000).toLocaleDateString()}`);

  // Step 4: Verify all consents
  console.log("\n>>> Step 4: Verify consent status for each purpose");

  const purposesToCheck = [
    { purpose: Purpose.IdentityVerification, name: "IdentityVerification" },
    { purpose: Purpose.CreditScoring, name: "CreditScoring" },
    { purpose: Purpose.DirectMarketing, name: "DirectMarketing" },
    { purpose: Purpose.FraudPrevention, name: "FraudPrevention" }
  ];

  console.log("\n    Consent Status:");
  for (const p of purposesToCheck) {
    const hasConsent = await kantaraConsent.hasValidConsent(
      customer.address,
      bank.address,
      p.purpose
    );
    console.log(`      ${p.name}: ${hasConsent ? "✓ VALID" : "✗ NONE"}`);
  }

  // Step 5: View full consent receipts
  console.log("\n>>> Step 5: View customer's consent receipts");

  const receiptIds = await kantaraConsent.getUserReceipts(customer.address);
  console.log(`\n    Customer has ${receiptIds.length} consent receipts:\n`);

  for (let i = 0; i < receiptIds.length; i++) {
    const receipt = await kantaraConsent.getConsentReceipt(receiptIds[i]);
    const expiryDate = receipt.expiryTime === 0n
      ? "Never"
      : new Date(Number(receipt.expiryTime) * 1000).toLocaleDateString();

    console.log(`    [${i + 1}] Receipt: ${receiptIds[i].slice(0, 20)}...`);
    console.log(`        Data Controller: ${receipt.dataController.slice(0, 10)}... (Bank)`);
    console.log(`        Consent Type: ${ConsentTypeNames[receipt.consentType]}`);
    console.log(`        Purposes: ${receipt.purposes.length}`);
    console.log(`        PI Categories: ${receipt.piCategories.length}`);
    console.log(`        Third-party OK: ${receipt.thirdPartyDisclosure}`);
    console.log(`        Expires: ${expiryDate}`);
    console.log(`        Policy: ${receipt.policyUrl}`);
    console.log();
  }

  // Step 6: Customer revokes marketing consent
  console.log(">>> Step 6: Customer revokes marketing consent");

  await kantaraConsent.connect(customer).revokeConsent(marketingReceiptId);
  console.log("    ✓ Marketing consent revoked");

  // Verify revocation
  const marketingStillValid = await kantaraConsent.hasValidConsent(
    customer.address,
    bank.address,
    Purpose.DirectMarketing
  );
  console.log(`    Marketing consent now: ${marketingStillValid ? "VALID" : "REVOKED"}`);

  // KYC consent should still be valid
  const kycStillValid = await kantaraConsent.hasValidConsent(
    customer.address,
    bank.address,
    Purpose.IdentityVerification
  );
  console.log(`    KYC consent still: ${kycStillValid ? "VALID" : "INVALID"}`);

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • KantaraConsentReceipt provides formal consent documentation");
  console.log("  • Each consent receipt includes full Kantara specification fields");
  console.log("  • Mandatory KYC consent separate from optional marketing");
  console.log("  • Third-party disclosure explicitly tracked");
  console.log("  • Different expiration periods per consent type");
  console.log("  • Customers can revoke optional consents at any time");
  console.log("  • hasValidConsent() provides purpose-specific verification");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
