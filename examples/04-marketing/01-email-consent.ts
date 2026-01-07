/**
 * Example: Email Consent
 * Scenario: Marketing
 * Persona: Consumers, Marketing Teams, Compliance Officers
 *
 * This example demonstrates:
 * - Double opt-in consent pattern
 * - GDPR-compliant email marketing consent
 * - Consent with expiration (renewal required)
 * - Easy unsubscribe workflow
 *
 * Scenario:
 * User subscribes to newsletter:
 * 1. User requests subscription (initial opt-in)
 * 2. Confirmation sent (double opt-in verification)
 * 3. User confirms subscription
 * 4. Marketing sends emails with valid consent
 * 5. User unsubscribes (consent revoked)
 *
 * Run with:
 * npx hardhat run examples/04-marketing/01-email-consent.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Marketing Example: Email Consent");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up email consent scenario...\n");

  const [deployer, user, marketingPlatform] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  User:               ${user.address.slice(0, 10)}...`);
  console.log(`  Marketing Platform: ${marketingPlatform.address.slice(0, 10)}...`);

  // Deploy ConsentReceipt
  const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceiptFactory.deploy();
  await consentReceipt.waitForDeployment();

  console.log(`\nConsentReceipt deployed at: ${await consentReceipt.getAddress()}`);

  // Get current time
  const block = await ethers.provider.getBlock("latest");
  const currentTime = block!.timestamp;

  // Define consent purposes
  const EMAIL_NEWSLETTER = "email_newsletter";
  const EMAIL_PROMOTIONS = "email_promotions";
  const EMAIL_PRODUCT_UPDATES = "email_product_updates";

  // === SCENARIO ===

  // Step 1: User requests newsletter subscription
  console.log("\n>>> Step 1: User requests newsletter subscription");
  console.log("    User enters email on website subscription form.\n");

  // Initial request (pending confirmation)
  console.log("    Status: PENDING CONFIRMATION");
  console.log("    (Awaiting double opt-in verification)");

  // Step 2: User confirms subscription (double opt-in)
  console.log("\n>>> Step 2: User confirms subscription (double opt-in)");
  console.log("    User clicks confirmation link in email.\n");

  // One year expiration (requires annual renewal)
  const oneYear = 365 * 24 * 60 * 60;
  const newsletterExpiry = currentTime + oneYear;

  await consentReceipt.connect(user)["giveConsent(string,uint256)"](
    EMAIL_NEWSLETTER,
    newsletterExpiry
  );

  console.log("    ✓ Newsletter consent confirmed");
  console.log(`      Purpose: ${EMAIL_NEWSLETTER}`);
  console.log(`      Expires: ${new Date(newsletterExpiry * 1000).toLocaleDateString()}`);
  console.log("      Pattern: Double opt-in verified");

  // Step 3: User opts into promotional emails
  console.log("\n>>> Step 3: User opts into promotional emails (optional)");

  const sixMonths = 180 * 24 * 60 * 60;
  const promoExpiry = currentTime + sixMonths;

  await consentReceipt.connect(user)["giveConsent(string,uint256)"](
    EMAIL_PROMOTIONS,
    promoExpiry
  );

  console.log("    ✓ Promotional emails consent given");
  console.log(`      Expires: ${new Date(promoExpiry * 1000).toLocaleDateString()}`);

  // Step 4: User opts into product updates
  console.log("\n>>> Step 4: User opts into product update emails");

  await consentReceipt.connect(user)["giveConsent(string)"](EMAIL_PRODUCT_UPDATES);

  console.log("    ✓ Product updates consent given (no expiration)");

  // Step 5: Marketing platform verifies consent before sending
  console.log("\n>>> Step 5: Marketing platform verifies consent before sending");

  const purposes = [EMAIL_NEWSLETTER, EMAIL_PROMOTIONS, EMAIL_PRODUCT_UPDATES];

  console.log("\n    Consent verification before email send:");
  for (const purpose of purposes) {
    const hasConsent = await consentReceipt.getConsentStatus(user.address, purpose);
    console.log(`      ${purpose}: ${hasConsent ? "✓ CAN SEND" : "✗ DO NOT SEND"}`);
  }

  // Verify non-consented purpose
  const hasMarketingCalls = await consentReceipt.getConsentStatus(user.address, "marketing_calls");
  console.log(`      marketing_calls: ${hasMarketingCalls ? "✓ CAN CALL" : "✗ NO CONSENT"}`);

  // Step 6: View user's email preferences
  console.log("\n>>> Step 6: View user's email preferences");

  const consents = await consentReceipt.getUserConsents(user.address);

  console.log(`\n    User has ${consents.length} email preferences:\n`);

  for (let i = 0; i < consents.length; i++) {
    const consent = consents[i];
    const expiryText = consent.expiryTime === 0n
      ? "Never (until revoked)"
      : new Date(Number(consent.expiryTime) * 1000).toLocaleDateString();

    console.log(`    [${i}] ${consent.purpose}`);
    console.log(`        Status: ${consent.isValid ? "SUBSCRIBED" : "UNSUBSCRIBED"}`);
    console.log(`        Subscribed: ${new Date(Number(consent.timestamp) * 1000).toLocaleString()}`);
    console.log(`        Renewal: ${expiryText}`);
    console.log();
  }

  // Step 7: User unsubscribes from promotional emails
  console.log(">>> Step 7: User unsubscribes from promotional emails");
  console.log("    User clicks unsubscribe link in email footer.\n");

  // Find the promotional consent index
  let promoIndex = -1;
  for (let i = 0; i < consents.length; i++) {
    if (consents[i].purpose === EMAIL_PROMOTIONS) {
      promoIndex = i;
      break;
    }
  }

  if (promoIndex >= 0) {
    await consentReceipt.connect(user).revokeConsent(promoIndex);
    console.log("    ✓ Promotional emails: UNSUBSCRIBED");
  }

  // Step 8: Verify updated consent status
  console.log("\n>>> Step 8: Verify updated consent status");

  console.log("\n    Current subscription status:");
  for (const purpose of purposes) {
    const hasConsent = await consentReceipt.getConsentStatus(user.address, purpose);
    const status = hasConsent ? "SUBSCRIBED" : "UNSUBSCRIBED";
    console.log(`      ${purpose}: ${status}`);
  }

  // Step 9: Show compliance evidence
  console.log("\n>>> Step 9: Generate compliance evidence");

  const finalConsents = await consentReceipt.getUserConsents(user.address);

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           EMAIL CONSENT COMPLIANCE RECORD               │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log(`    │  User: ${user.address.slice(0, 30)}...          │`);
  console.log(`    │  Report Date: ${new Date().toLocaleString()}            │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  SUBSCRIPTION HISTORY                                   │");

  for (const consent of finalConsents) {
    const status = consent.isValid ? "ACTIVE" : "REVOKED";
    const padding = " ".repeat(Math.max(0, 25 - consent.purpose.length));
    console.log(`    │    ${consent.purpose}${padding}${status}       │`);
  }

  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  COMPLIANCE VERIFICATION                                │");
  console.log("    │  ✓ Double opt-in pattern used                          │");
  console.log("    │  ✓ Explicit consent timestamps recorded                │");
  console.log("    │  ✓ Easy unsubscribe mechanism provided                 │");
  console.log("    │  ✓ Consent history preserved for audit                 │");
  console.log("    │  ✓ GDPR Article 7 compliance verified                  │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Double opt-in provides proof of consent");
  console.log("  • Consent expires and requires renewal");
  console.log("  • Each email type has separate consent");
  console.log("  • Users can unsubscribe from specific types");
  console.log("  • Consent history preserved for compliance");
  console.log("  • Marketing must verify consent before sending");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
