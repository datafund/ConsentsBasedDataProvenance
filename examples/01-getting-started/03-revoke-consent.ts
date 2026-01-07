/**
 * Example: Revoke Consent
 * Scenario: Getting Started
 * Persona: End Users, Developers
 *
 * This example demonstrates:
 * - How users can revoke their consent at any time
 * - Consent status after revocation
 * - Maintaining consent history for audit purposes
 *
 * Prerequisites:
 * - Local Hardhat node running (npm run node)
 *
 * Run with:
 * npx hardhat run examples/01-getting-started/03-revoke-consent.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n========================================");
  console.log("  Example: Revoke Consent");
  console.log("========================================\n");

  // === SETUP ===
  console.log(">>> Setting up contracts and accounts...\n");

  const [deployer, user] = await ethers.getSigners();
  console.log(`User: ${user.address}`);

  const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceiptFactory.deploy();
  await consentReceipt.waitForDeployment();
  console.log(`ConsentReceipt deployed at: ${await consentReceipt.getAddress()}`);

  // === SCENARIO ===

  // Step 1: Give multiple consents
  console.log("\n>>> Step 1: User gives consent for multiple purposes");

  await consentReceipt.connect(user)["giveConsent(string)"]("analytics");
  console.log("✓ Consent given for 'analytics' (index 0)");

  await consentReceipt.connect(user)["giveConsent(string)"]("marketing");
  console.log("✓ Consent given for 'marketing' (index 1)");

  await consentReceipt.connect(user)["giveConsent(string)"]("third_party_sharing");
  console.log("✓ Consent given for 'third_party_sharing' (index 2)");

  // Step 2: Verify all consents are valid
  console.log("\n>>> Step 2: Verify all consents are valid");
  const purposes = ["analytics", "marketing", "third_party_sharing"];
  for (const purpose of purposes) {
    const isValid = await consentReceipt.getConsentStatus(user.address, purpose);
    console.log(`'${purpose}': ${isValid ? "VALID" : "INVALID"}`);
  }

  // Step 3: User decides to revoke marketing consent
  console.log("\n>>> Step 3: User revokes 'marketing' consent (index 1)");
  const revokeTx = await consentReceipt.connect(user).revokeConsent(1);
  const revokeReceipt = await revokeTx.wait();
  console.log(`Transaction hash: ${revokeReceipt?.hash}`);
  console.log("Marketing consent revoked!");

  // Step 4: Verify consent status after revocation
  console.log("\n>>> Step 4: Verify consent status after revocation");
  for (const purpose of purposes) {
    const isValid = await consentReceipt.getConsentStatus(user.address, purpose);
    console.log(`'${purpose}': ${isValid ? "VALID" : "REVOKED"}`);
  }
  // Expected: analytics: VALID, marketing: REVOKED, third_party_sharing: VALID

  // Step 5: View consent history (revoked consents are preserved)
  console.log("\n>>> Step 5: View consent history (including revoked)");
  const consents = await consentReceipt.getUserConsents(user.address);

  consents.forEach((consent, index) => {
    const status = consent.isValid ? "✓ ACTIVE" : "✗ REVOKED";
    console.log(`[${index}] ${consent.purpose}: ${status}`);
  });

  // Step 6: Demonstrate that revoked consent cannot be revoked again
  console.log("\n>>> Step 6: Attempt to revoke already-revoked consent");
  try {
    await consentReceipt.connect(user).revokeConsent(1);
    console.log("This should not happen!");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Consent already revoked")) {
      console.log("✓ Correctly rejected: Cannot revoke already-revoked consent");
    } else {
      throw error;
    }
  }

  // Step 7: User can give consent again for the same purpose
  console.log("\n>>> Step 7: User gives consent for 'marketing' again");
  await consentReceipt.connect(user)["giveConsent(string)"]("marketing");
  console.log("✓ New consent given for 'marketing' (index 3)");

  // Step 8: View final state
  console.log("\n>>> Step 8: Final consent status");
  const finalConsents = await consentReceipt.getUserConsents(user.address);

  console.log("\nAll consent records:");
  finalConsents.forEach((consent, index) => {
    const status = consent.isValid ? "ACTIVE" : "REVOKED";
    const time = new Date(Number(consent.timestamp) * 1000).toLocaleTimeString();
    console.log(`  [${index}] ${consent.purpose} - ${status} (recorded at ${time})`);
  });

  console.log("\nCurrent consent status:");
  for (const purpose of purposes) {
    const isValid = await consentReceipt.getConsentStatus(user.address, purpose);
    console.log(`  '${purpose}': ${isValid ? "ACTIVE" : "INACTIVE"}`);
  }

  // === VERIFICATION ===
  console.log("\n>>> Verification");
  const totalRecords = await consentReceipt.getUserConsentsCount(user.address);
  console.log(`Total consent records: ${totalRecords}`);
  console.log("(Includes both active and revoked for audit trail)");

  // Check that marketing has valid consent again (from the new consent at index 3)
  const marketingValid = await consentReceipt.getConsentStatus(user.address, "marketing");
  console.log(`Marketing consent is now: ${marketingValid ? "ACTIVE" : "INACTIVE"}`);

  // === SUMMARY ===
  console.log("\n========================================");
  console.log("  Example completed successfully!");
  console.log("========================================");
  console.log("\nKey Takeaways:");
  console.log("1. Users can revoke consent at any time using the consent index");
  console.log("2. Revoked consents remain in history for audit purposes");
  console.log("3. getConsentStatus() checks if ANY valid consent exists for a purpose");
  console.log("4. Users can give consent again after revoking (creates new record)");
  console.log("5. Cannot revoke an already-revoked consent\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
