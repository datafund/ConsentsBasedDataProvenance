/**
 * Example: Patient Consent
 * Scenario: Healthcare
 * Persona: Patients, Healthcare Providers, Compliance Officers
 *
 * This example demonstrates:
 * - Multi-purpose consent for healthcare services
 * - Different expiration periods per purpose
 * - Consent verification before data operations
 *
 * Scenario:
 * Patient Alice arrives at the hospital and gives consent for:
 * - Treatment (permanent) - Required for medical care
 * - Insurance billing (2 years) - For claims processing
 * - Research (1 year) - Optional participation in clinical research
 *
 * Run with:
 * npx hardhat run examples/02-healthcare/01-patient-consent.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Healthcare Example: Patient Consent");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up healthcare scenario...\n");

  const [deployer, patient, doctor, insuranceAdmin, researcher] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Patient (Alice): ${patient.address.slice(0, 10)}...`);
  console.log(`  Doctor: ${doctor.address.slice(0, 10)}...`);
  console.log(`  Insurance Admin: ${insuranceAdmin.address.slice(0, 10)}...`);
  console.log(`  Researcher: ${researcher.address.slice(0, 10)}...`);

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

  // Get current time for expiry calculations
  const block = await ethers.provider.getBlock("latest");
  const currentTime = block!.timestamp;

  // Define consent purposes
  const PURPOSES = {
    TREATMENT: "medical_treatment",
    BILLING: "insurance_billing",
    RESEARCH: "medical_research"
  };

  // === SCENARIO ===

  // Step 1: Patient arrives and gives consent for treatment (permanent)
  console.log("\n>>> Step 1: Patient gives consent for TREATMENT (permanent)");
  console.log("    This consent has no expiration - required for ongoing care.");

  await consentReceipt.connect(patient)["giveConsent(string)"](PURPOSES.TREATMENT);
  console.log("    ✓ Treatment consent recorded");

  // Step 2: Patient gives consent for insurance billing (2 years)
  console.log("\n>>> Step 2: Patient gives consent for INSURANCE BILLING (2 years)");
  console.log("    Required for claims processing with insurance providers.");

  const twoYears = 2 * 365 * 24 * 60 * 60;
  const billingExpiry = currentTime + twoYears;

  await consentReceipt.connect(patient)["giveConsent(string,uint256)"](
    PURPOSES.BILLING,
    billingExpiry
  );
  console.log(`    ✓ Billing consent recorded (expires: ${new Date(billingExpiry * 1000).toLocaleDateString()})`);

  // Step 3: Patient opts into research participation (1 year)
  console.log("\n>>> Step 3: Patient OPTS INTO research participation (1 year)");
  console.log("    This is optional - patient chooses to contribute to medical research.");

  const oneYear = 365 * 24 * 60 * 60;
  const researchExpiry = currentTime + oneYear;

  await consentReceipt.connect(patient)["giveConsent(string,uint256)"](
    PURPOSES.RESEARCH,
    researchExpiry
  );
  console.log(`    ✓ Research consent recorded (expires: ${new Date(researchExpiry * 1000).toLocaleDateString()})`);

  // Step 4: Verify all consents are active
  console.log("\n>>> Step 4: Verify consent status");
  console.log("    Hospital system checks consent before any data operation.\n");

  const treatmentConsent = await consentReceipt.getConsentStatus(patient.address, PURPOSES.TREATMENT);
  const billingConsent = await consentReceipt.getConsentStatus(patient.address, PURPOSES.BILLING);
  const researchConsent = await consentReceipt.getConsentStatus(patient.address, PURPOSES.RESEARCH);

  console.log(`    Treatment consent:  ${treatmentConsent ? "✓ ACTIVE" : "✗ INACTIVE"}`);
  console.log(`    Billing consent:    ${billingConsent ? "✓ ACTIVE" : "✗ INACTIVE"}`);
  console.log(`    Research consent:   ${researchConsent ? "✓ ACTIVE" : "✗ INACTIVE"}`);

  // Step 5: View detailed consent records
  console.log("\n>>> Step 5: View patient's consent records");
  const consents = await consentReceipt.getUserConsents(patient.address);

  console.log(`\n    Patient has ${consents.length} consent records:\n`);
  consents.forEach((consent, index) => {
    const expiryText = consent.expiryTime === 0n
      ? "Never (permanent)"
      : new Date(Number(consent.expiryTime) * 1000).toLocaleDateString();

    console.log(`    [${index}] Purpose: ${consent.purpose}`);
    console.log(`        Given: ${new Date(Number(consent.timestamp) * 1000).toLocaleString()}`);
    console.log(`        Expires: ${expiryText}`);
    console.log(`        Status: ${consent.isValid ? "Active" : "Revoked"}`);
    console.log();
  });

  // Step 6: Demonstrate consent verification before data access
  console.log(">>> Step 6: Simulate consent checks for different operations\n");

  // Doctor needs treatment consent
  const canTreat = await consentReceipt.getConsentStatus(patient.address, PURPOSES.TREATMENT);
  console.log(`    Doctor requests to record diagnosis:`);
  console.log(`    → Checking '${PURPOSES.TREATMENT}' consent: ${canTreat ? "APPROVED" : "DENIED"}`);

  // Insurance needs billing consent
  const canBill = await consentReceipt.getConsentStatus(patient.address, PURPOSES.BILLING);
  console.log(`\n    Insurance requests claim data:`);
  console.log(`    → Checking '${PURPOSES.BILLING}' consent: ${canBill ? "APPROVED" : "DENIED"}`);

  // Researcher needs research consent
  const canResearch = await consentReceipt.getConsentStatus(patient.address, PURPOSES.RESEARCH);
  console.log(`\n    Researcher requests anonymized data:`);
  console.log(`    → Checking '${PURPOSES.RESEARCH}' consent: ${canResearch ? "APPROVED" : "DENIED"}`);

  // Marketing has no consent
  const canMarket = await consentReceipt.getConsentStatus(patient.address, "marketing");
  console.log(`\n    Marketing requests contact info:`);
  console.log(`    → Checking 'marketing' consent: ${canMarket ? "APPROVED" : "DENIED (no consent)"}`);

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  HIPAA Compliance Notes:");
  console.log("  • Each purpose has explicit authorization (45 CFR 164.508)");
  console.log("  • Consent timestamps provide audit trail");
  console.log("  • Research participation is opt-in with clear expiration");
  console.log("  • Consent verification happens before every data operation");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
