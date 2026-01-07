/**
 * Example: Basic Consent
 * Scenario: Getting Started
 * Persona: End Users, Developers
 *
 * This example demonstrates:
 * - Deploying the ConsentReceipt contract
 * - Giving consent for a specific purpose
 * - Checking consent status
 * - Viewing consent details
 *
 * Prerequisites:
 * - Local Hardhat node running (npm run node)
 *
 * Run with:
 * npx hardhat run examples/01-getting-started/01-basic-consent.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n========================================");
  console.log("  Example: Basic Consent Flow");
  console.log("========================================\n");

  // === SETUP ===
  console.log(">>> Setting up contracts and accounts...\n");

  // Get test accounts
  const [deployer, user] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`User: ${user.address}`);

  // Deploy ConsentReceipt contract
  const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceiptFactory.deploy();
  await consentReceipt.waitForDeployment();
  console.log(`\nConsentReceipt deployed at: ${await consentReceipt.getAddress()}`);

  // === SCENARIO ===

  // Step 1: Check initial consent status
  console.log("\n>>> Step 1: Check initial consent status");
  const initialStatus = await consentReceipt.getConsentStatus(user.address, "analytics");
  console.log(`Has consent for 'analytics': ${initialStatus}`);
  // Expected: false (no consent given yet)

  // Step 2: User gives consent for analytics
  console.log("\n>>> Step 2: User gives consent for 'analytics'");
  const tx = await consentReceipt.connect(user)["giveConsent(string)"]("analytics");
  const receipt = await tx.wait();
  console.log(`Transaction hash: ${receipt?.hash}`);
  console.log("Consent given successfully!");

  // Step 3: Verify consent status changed
  console.log("\n>>> Step 3: Verify consent status");
  const newStatus = await consentReceipt.getConsentStatus(user.address, "analytics");
  console.log(`Has consent for 'analytics': ${newStatus}`);
  // Expected: true

  // Step 4: View consent details
  console.log("\n>>> Step 4: View consent details");
  const consents = await consentReceipt.getUserConsents(user.address);
  console.log(`Total consents: ${consents.length}`);

  if (consents.length > 0) {
    const consent = consents[0];
    console.log("\nConsent Record:");
    console.log(`  User: ${consent.user}`);
    console.log(`  Purpose: ${consent.purpose}`);
    console.log(`  Timestamp: ${consent.timestamp} (${new Date(Number(consent.timestamp) * 1000).toISOString()})`);
    console.log(`  Expiry: ${consent.expiryTime === 0n ? "Never" : consent.expiryTime}`);
    console.log(`  Is Valid: ${consent.isValid}`);
  }

  // Step 5: Give consent for another purpose
  console.log("\n>>> Step 5: User gives consent for 'marketing'");
  await consentReceipt.connect(user)["giveConsent(string)"]("marketing");
  console.log("Consent for 'marketing' given!");

  // Step 6: Check both consent statuses
  console.log("\n>>> Step 6: Verify multiple consents");
  const analyticsConsent = await consentReceipt.getConsentStatus(user.address, "analytics");
  const marketingConsent = await consentReceipt.getConsentStatus(user.address, "marketing");
  const researchConsent = await consentReceipt.getConsentStatus(user.address, "research");

  console.log(`Has 'analytics' consent: ${analyticsConsent}`);
  console.log(`Has 'marketing' consent: ${marketingConsent}`);
  console.log(`Has 'research' consent: ${researchConsent}`);
  // Expected: true, true, false

  // === VERIFICATION ===
  console.log("\n>>> Verification");
  const finalCount = await consentReceipt.getUserConsentsCount(user.address);
  console.log(`Total consents recorded: ${finalCount}`);

  // === SUMMARY ===
  console.log("\n========================================");
  console.log("  Example completed successfully!");
  console.log("========================================");
  console.log("\nKey Takeaways:");
  console.log("1. Consent is tracked per user and per purpose");
  console.log("2. getConsentStatus() returns true/false for quick checks");
  console.log("3. getUserConsents() returns full consent history");
  console.log("4. Each consent has timestamp and validity tracking\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
