/**
 * Example: Delegated Consent
 * Scenario: Advanced Patterns
 * Persona: Developers, Healthcare IT, Legal
 *
 * This example demonstrates:
 * - ConsentProxy for delegation management
 * - Guardian/Power of Attorney consent patterns
 * - Purpose-restricted delegation
 * - Delegation lifecycle management
 *
 * Scenario:
 * Healthcare delegation scenario:
 * 1. Elderly patient authorizes family member as delegate
 * 2. Delegate can consent to specific healthcare purposes
 * 3. Delegate consents on patient's behalf
 * 4. Delegation can be revoked or extended
 *
 * Run with:
 * npx hardhat run examples/07-advanced-patterns/02-delegated-consent.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Advanced Pattern: Delegated Consent");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up delegated consent scenario...\n");

  const [deployer, patient, guardian, hospital, researcher] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Patient (Principal):   ${patient.address.slice(0, 10)}...`);
  console.log(`  Guardian (Delegate):   ${guardian.address.slice(0, 10)}...`);
  console.log(`  Hospital:              ${hospital.address.slice(0, 10)}...`);
  console.log(`  Researcher:            ${researcher.address.slice(0, 10)}...`);

  // Deploy ConsentProxy
  const ConsentProxyFactory = await ethers.getContractFactory("ConsentProxy");
  const consentProxy = await ConsentProxyFactory.deploy();
  await consentProxy.waitForDeployment();

  // Deploy ConsentReceipt
  const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceiptFactory.deploy();
  await consentReceipt.waitForDeployment();

  console.log(`\nConsentProxy deployed at: ${await consentProxy.getAddress()}`);
  console.log(`ConsentReceipt deployed at: ${await consentReceipt.getAddress()}`);

  // Get current time
  const block = await ethers.provider.getBlock("latest");
  const currentTime = block!.timestamp;

  // Define healthcare purposes
  const TREATMENT = "medical_treatment";
  const EMERGENCY = "emergency_care";
  const BILLING = "insurance_billing";
  const RESEARCH = "medical_research";

  // === SCENARIO ===

  // Step 1: Patient grants delegation to guardian
  console.log("\n>>> Step 1: Patient grants delegation to guardian");
  console.log("    Patient authorizes family member for healthcare decisions.\n");

  const sixMonths = 180 * 24 * 60 * 60;
  const delegationExpiry = currentTime + sixMonths;

  // Patient grants delegation for specific purposes
  await consentProxy.connect(patient).grantDelegation(
    guardian.address,
    delegationExpiry,
    [TREATMENT, EMERGENCY, BILLING] // Allowed purposes
  );

  console.log("    ✓ Delegation granted");
  console.log(`      Delegate: ${guardian.address.slice(0, 10)}... (Guardian)`);
  console.log(`      Valid until: ${new Date(delegationExpiry * 1000).toLocaleDateString()} (6 months)`);
  console.log("      Allowed purposes:");
  console.log(`        • ${TREATMENT}`);
  console.log(`        • ${EMERGENCY}`);
  console.log(`        • ${BILLING}`);

  // Step 2: Verify delegation
  console.log("\n>>> Step 2: Verify delegation status");

  const delegation = await consentProxy.getDelegation(patient.address, guardian.address);

  console.log("\n    Delegation Details:");
  console.log(`      Delegator: ${delegation.delegator.slice(0, 10)}...`);
  console.log(`      Delegate: ${delegation.delegate.slice(0, 10)}...`);
  console.log(`      Active: ${delegation.isActive}`);
  console.log(`      Valid Until: ${new Date(Number(delegation.validUntil) * 1000).toLocaleDateString()}`);
  console.log(`      Allowed Purposes: ${delegation.allowedPurposeHashes.length}`);

  // Step 3: Check delegation for different purposes
  console.log("\n>>> Step 3: Check delegation for different purposes");

  const purposesToCheck = [TREATMENT, EMERGENCY, BILLING, RESEARCH];

  console.log("\n    Purpose Authorization:");
  for (const purpose of purposesToCheck) {
    const canAct = await consentProxy.canActFor(patient.address, guardian.address, purpose);
    const status = canAct ? "✓ AUTHORIZED" : "✗ NOT AUTHORIZED";
    console.log(`      ${purpose}: ${status}`);
  }

  // Step 4: Guardian consents on patient's behalf
  console.log("\n>>> Step 4: Guardian consents on patient's behalf");
  console.log("    Guardian uses delegated authority for treatment consent.\n");

  // First verify delegation is valid
  const canConsentForTreatment = await consentProxy.canActFor(patient.address, guardian.address, TREATMENT);

  if (canConsentForTreatment) {
    // Guardian gives consent (in a real system, this would be linked to patient)
    // Note: This is a simplified demonstration - a real implementation would
    // have the ConsentReceipt contract integrate with ConsentProxy
    await consentReceipt.connect(guardian)["giveConsent(string)"](TREATMENT);
    console.log("    ✓ Guardian gave treatment consent on patient's behalf");
    console.log("      Purpose: medical_treatment");
    console.log("      Authority: Delegated from patient");
  }

  // Step 5: Guardian tries unauthorized purpose
  console.log("\n>>> Step 5: Guardian attempts unauthorized purpose (research)");

  const canConsentForResearch = await consentProxy.canActFor(patient.address, guardian.address, RESEARCH);

  if (canConsentForResearch) {
    console.log("    Guardian can consent for research");
  } else {
    console.log("    ✗ Guardian CANNOT consent for research");
    console.log("      Reason: Purpose not in allowed list");
    console.log("      Patient must consent personally or update delegation");
  }

  // Step 6: Patient extends delegation
  console.log("\n>>> Step 6: Patient extends delegation");

  // Get current block time for the extension (contract enforces max 365 days from now)
  const extendBlock = await ethers.provider.getBlock("latest");
  const extendTime = extendBlock!.timestamp;
  const oneYear = 365 * 24 * 60 * 60;
  const newExpiry = extendTime + oneYear; // Extend to max allowed (1 year from now)

  await consentProxy.connect(patient).extendDelegation(guardian.address, newExpiry);

  console.log(`    ✓ Delegation extended: 6 months → 1 year`);
  console.log(`      New expiry: ${new Date(newExpiry * 1000).toLocaleDateString()}`);

  // Step 7: View all delegations
  console.log("\n>>> Step 7: View delegation relationships");

  const patientDelegates = await consentProxy.getDelegates(patient.address);
  const guardianDelegators = await consentProxy.getDelegators(guardian.address);

  console.log(`\n    Patient's delegates: ${patientDelegates.length}`);
  for (const delegate of patientDelegates) {
    const valid = await consentProxy.isDelegationValid(patient.address, delegate);
    console.log(`      • ${delegate.slice(0, 10)}... (${valid ? "Active" : "Inactive"})`);
  }

  console.log(`\n    Guardian acts for: ${guardianDelegators.length} delegator(s)`);
  for (const delegator of guardianDelegators) {
    const valid = await consentProxy.isDelegationValid(delegator, guardian.address);
    console.log(`      • ${delegator.slice(0, 10)}... (${valid ? "Active" : "Inactive"})`);
  }

  // Step 8: Patient revokes delegation
  console.log("\n>>> Step 8: Patient revokes delegation");

  await consentProxy.connect(patient).revokeDelegation(guardian.address);

  console.log("    ✓ Delegation revoked");

  // Verify revocation
  const canActAfterRevoke = await consentProxy.canActFor(patient.address, guardian.address, TREATMENT);
  console.log(`    Guardian can still act: ${canActAfterRevoke ? "YES" : "NO"}`);

  // === DELEGATION REPORT ===

  console.log("\n" + "-".repeat(60));
  console.log("  Delegation Report");
  console.log("-".repeat(60));

  const finalDelegation = await consentProxy.getDelegation(patient.address, guardian.address);

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           CONSENT DELEGATION REPORT                     │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log(`    │  Principal: ${patient.address.slice(0, 25)}...           │`);
  console.log(`    │  Delegate: ${guardian.address.slice(0, 25)}...            │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  STATUS                                                 │");
  console.log(`    │    Active: ${finalDelegation.isActive ? "YES" : "NO (Revoked)"}                                       │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  AUTHORIZED ACTIONS TAKEN                               │");
  console.log("    │    • Treatment consent: Given by delegate              │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  DENIED ACTIONS                                         │");
  console.log("    │    • Research consent: Not in allowed purposes         │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  COMPLIANCE                                             │");
  console.log("    │  ✓ Delegation explicitly granted by principal          │");
  console.log("    │  ✓ Purpose restrictions enforced                       │");
  console.log("    │  ✓ Time bounds respected                               │");
  console.log("    │  ✓ Revocation effective immediately                    │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Delegation requires explicit authorization");
  console.log("  • Purposes can be restricted per delegation");
  console.log("  • Delegates cannot exceed authorized scope");
  console.log("  • Delegations have time bounds");
  console.log("  • Principal can extend or revoke anytime");
  console.log("  • Supports guardian/POA healthcare scenarios");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
