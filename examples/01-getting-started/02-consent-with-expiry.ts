/**
 * Example: Consent with Expiry
 * Scenario: Getting Started
 * Persona: End Users, Developers
 *
 * This example demonstrates:
 * - Setting expiration time on consent
 * - Verifying consent validity over time
 * - Understanding blockchain timestamps
 *
 * Prerequisites:
 * - Local Hardhat node running (npm run node)
 *
 * Run with:
 * npx hardhat run examples/01-getting-started/02-consent-with-expiry.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n========================================");
  console.log("  Example: Consent with Expiry");
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

  // Step 1: Get current blockchain time
  console.log("\n>>> Step 1: Get current blockchain time");
  const block = await ethers.provider.getBlock("latest");
  const currentTime = block!.timestamp;
  console.log(`Current block timestamp: ${currentTime}`);
  console.log(`Current time (ISO): ${new Date(currentTime * 1000).toISOString()}`);

  // Step 2: Give consent that expires in 1 year
  console.log("\n>>> Step 2: Give consent with 1-year expiry");
  const oneYear = 365 * 24 * 60 * 60; // seconds in a year
  const expiryTime = currentTime + oneYear;

  await consentReceipt.connect(user)["giveConsent(string,uint256)"](
    "email_marketing",
    expiryTime
  );
  console.log(`Consent given for 'email_marketing'`);
  console.log(`Expires at: ${new Date(expiryTime * 1000).toISOString()}`);

  // Step 3: Give consent that expires in 30 days
  console.log("\n>>> Step 3: Give consent with 30-day expiry");
  const thirtyDays = 30 * 24 * 60 * 60;
  const shortExpiry = currentTime + thirtyDays;

  await consentReceipt.connect(user)["giveConsent(string,uint256)"](
    "promotional_offers",
    shortExpiry
  );
  console.log(`Consent given for 'promotional_offers'`);
  console.log(`Expires at: ${new Date(shortExpiry * 1000).toISOString()}`);

  // Step 4: Give consent with no expiry (permanent)
  console.log("\n>>> Step 4: Give permanent consent (no expiry)");
  await consentReceipt.connect(user)["giveConsent(string)"]("terms_of_service");
  console.log(`Consent given for 'terms_of_service' (no expiry)`);

  // Step 5: View all consents
  console.log("\n>>> Step 5: View all consents with expiry info");
  const consents = await consentReceipt.getUserConsents(user.address);

  consents.forEach((consent, index) => {
    console.log(`\nConsent #${index}:`);
    console.log(`  Purpose: ${consent.purpose}`);
    console.log(`  Given at: ${new Date(Number(consent.timestamp) * 1000).toISOString()}`);
    if (consent.expiryTime === 0n) {
      console.log(`  Expiry: Never (permanent)`);
    } else {
      const expiryDate = new Date(Number(consent.expiryTime) * 1000);
      const daysUntilExpiry = Math.floor((Number(consent.expiryTime) - currentTime) / (24 * 60 * 60));
      console.log(`  Expiry: ${expiryDate.toISOString()} (${daysUntilExpiry} days from now)`);
    }
    console.log(`  Valid: ${consent.isValid}`);
  });

  // Step 6: Verify all consents are currently valid
  console.log("\n>>> Step 6: Verify consent validity");
  const purposes = ["email_marketing", "promotional_offers", "terms_of_service"];
  for (const purpose of purposes) {
    const isValid = await consentReceipt.getConsentStatus(user.address, purpose);
    console.log(`'${purpose}': ${isValid ? "VALID" : "INVALID"}`);
  }

  // Step 7: Simulate time passing (advance blockchain time)
  console.log("\n>>> Step 7: Simulate 31 days passing...");
  await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
  await ethers.provider.send("evm_mine", []);

  const newBlock = await ethers.provider.getBlock("latest");
  console.log(`New block timestamp: ${new Date(newBlock!.timestamp * 1000).toISOString()}`);

  // Step 8: Check consent validity after time passed
  console.log("\n>>> Step 8: Check consent validity after 31 days");
  for (const purpose of purposes) {
    const isValid = await consentReceipt.getConsentStatus(user.address, purpose);
    console.log(`'${purpose}': ${isValid ? "VALID" : "EXPIRED"}`);
  }
  // Expected: email_marketing: VALID, promotional_offers: EXPIRED, terms_of_service: VALID

  // === VERIFICATION ===
  console.log("\n>>> Verification");
  const emailValid = await consentReceipt.getConsentStatus(user.address, "email_marketing");
  const promoValid = await consentReceipt.getConsentStatus(user.address, "promotional_offers");
  const tosValid = await consentReceipt.getConsentStatus(user.address, "terms_of_service");

  console.log(`Email marketing (1-year expiry): ${emailValid ? "Still valid" : "Expired"}`);
  console.log(`Promotional offers (30-day expiry): ${promoValid ? "Still valid" : "Expired"}`);
  console.log(`Terms of service (no expiry): ${tosValid ? "Still valid" : "Expired"}`);

  // === SUMMARY ===
  console.log("\n========================================");
  console.log("  Example completed successfully!");
  console.log("========================================");
  console.log("\nKey Takeaways:");
  console.log("1. Expiry time is set in Unix timestamp (seconds since epoch)");
  console.log("2. expiryTime = 0 means the consent never expires");
  console.log("3. getConsentStatus() automatically checks expiration");
  console.log("4. Expired consent remains in history but returns false for status\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
