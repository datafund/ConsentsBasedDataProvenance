/**
 * Example: Preference Center
 * Scenario: Marketing
 * Persona: Consumers, Marketing Teams, Compliance Officers
 *
 * This example demonstrates:
 * - Comprehensive user preference management
 * - View all active consents
 * - Modify specific consents
 * - Bulk opt-out operations
 * - Consent history download
 *
 * Scenario:
 * User manages all marketing preferences:
 * 1. View current preferences
 * 2. Modify email preferences
 * 3. Bulk update multiple preferences
 * 4. Export consent history
 *
 * Run with:
 * npx hardhat run examples/04-marketing/05-preference-center.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Marketing Example: Preference Center");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up preference center scenario...\n");

  const [deployer, user] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  User:  ${user.address.slice(0, 10)}...`);

  // Deploy ConsentReceipt
  const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceiptFactory.deploy();
  await consentReceipt.waitForDeployment();

  console.log(`\nConsentReceipt deployed at: ${await consentReceipt.getAddress()}`);

  // Get current time
  const block = await ethers.provider.getBlock("latest");
  const currentTime = block!.timestamp;

  // Define all preference categories
  const PREFERENCES = {
    // Communication
    EMAIL_NEWSLETTER: { key: "email_newsletter", name: "Email Newsletter", category: "Communication" },
    EMAIL_PROMOTIONS: { key: "email_promotions", name: "Promotional Emails", category: "Communication" },
    EMAIL_PRODUCT: { key: "email_product_updates", name: "Product Updates", category: "Communication" },
    SMS_MARKETING: { key: "sms_marketing", name: "SMS Marketing", category: "Communication" },

    // Tracking
    ANALYTICS: { key: "cookies_analytics", name: "Analytics Cookies", category: "Tracking" },
    MARKETING_COOKIES: { key: "cookies_marketing", name: "Marketing Cookies", category: "Tracking" },
    PERSONALIZATION: { key: "ad_personalization", name: "Ad Personalization", category: "Tracking" },

    // Data Sharing
    SHARE_PARTNERS: { key: "share_partners", name: "Partner Sharing", category: "Data Sharing" },
    SHARE_ANALYTICS: { key: "share_analytics", name: "Analytics Sharing", category: "Data Sharing" }
  };

  // === SIMULATE EXISTING PREFERENCES ===

  console.log("\n>>> Simulating existing user preferences...\n");

  // User has some existing consents
  const oneYear = 365 * 24 * 60 * 60;
  const expiry = currentTime + oneYear;

  // Already opted in
  await consentReceipt.connect(user)["giveConsent(string,uint256)"](PREFERENCES.EMAIL_NEWSLETTER.key, expiry);
  await consentReceipt.connect(user)["giveConsent(string,uint256)"](PREFERENCES.EMAIL_PRODUCT.key, expiry);
  await consentReceipt.connect(user)["giveConsent(string,uint256)"](PREFERENCES.ANALYTICS.key, expiry);
  await consentReceipt.connect(user)["giveConsent(string,uint256)"](PREFERENCES.SHARE_ANALYTICS.key, expiry);

  console.log("    Existing preferences loaded.");

  // === SCENARIO ===

  // Step 1: User opens preference center
  console.log("\n>>> Step 1: User opens Preference Center\n");

  console.log("    ╔═══════════════════════════════════════════════════════════╗");
  console.log("    ║               🔧 Preference Center                          ║");
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log("    ║  Manage your communication and privacy preferences        ║");
  console.log("    ╚═══════════════════════════════════════════════════════════╝");

  // Step 2: Display current preferences by category
  console.log("\n>>> Step 2: View current preferences\n");

  const categories = ["Communication", "Tracking", "Data Sharing"];

  for (const category of categories) {
    console.log(`    ── ${category} ──`);

    for (const [, pref] of Object.entries(PREFERENCES)) {
      if (pref.category === category) {
        const hasConsent = await consentReceipt.getConsentStatus(user.address, pref.key);
        const checkbox = hasConsent ? "☑" : "☐";
        const status = hasConsent ? "ON" : "OFF";
        const padding = " ".repeat(Math.max(0, 25 - pref.name.length));
        console.log(`      ${checkbox} ${pref.name}${padding}[${status}]`);
      }
    }
    console.log();
  }

  // Step 3: User enables promotional emails
  console.log(">>> Step 3: User enables promotional emails");

  await consentReceipt.connect(user)["giveConsent(string,uint256)"](
    PREFERENCES.EMAIL_PROMOTIONS.key,
    expiry
  );
  console.log("    ✓ Promotional Emails: ENABLED");

  // Step 4: User disables analytics cookies
  console.log("\n>>> Step 4: User disables analytics cookies");

  const userConsents = await consentReceipt.getUserConsents(user.address);
  for (let i = 0; i < userConsents.length; i++) {
    if (userConsents[i].purpose === PREFERENCES.ANALYTICS.key && userConsents[i].isValid) {
      await consentReceipt.connect(user).revokeConsent(i);
      console.log("    ✓ Analytics Cookies: DISABLED");
      break;
    }
  }

  // Step 5: Bulk update - enable all communication
  console.log("\n>>> Step 5: Bulk update - Enable all communication");

  const communicationPrefs = Object.values(PREFERENCES).filter(p => p.category === "Communication");

  for (const pref of communicationPrefs) {
    const hasConsent = await consentReceipt.getConsentStatus(user.address, pref.key);
    if (!hasConsent) {
      await consentReceipt.connect(user)["giveConsent(string,uint256)"](pref.key, expiry);
      console.log(`    ✓ ${pref.name}: ENABLED`);
    } else {
      console.log(`    • ${pref.name}: Already enabled`);
    }
  }

  // Step 6: View updated preferences
  console.log("\n>>> Step 6: View updated preferences\n");

  for (const category of categories) {
    console.log(`    ── ${category} ──`);

    for (const [, pref] of Object.entries(PREFERENCES)) {
      if (pref.category === category) {
        const hasConsent = await consentReceipt.getConsentStatus(user.address, pref.key);
        const checkbox = hasConsent ? "☑" : "☐";
        const padding = " ".repeat(Math.max(0, 25 - pref.name.length));
        console.log(`      ${checkbox} ${pref.name}${padding}`);
      }
    }
    console.log();
  }

  // Step 7: Export consent history
  console.log(">>> Step 7: Export consent history\n");

  const allConsents = await consentReceipt.getUserConsents(user.address);

  console.log("    Consent History Export:");
  console.log("    ═══════════════════════════════════════════════════════════");
  console.log("    │ Purpose                    │ Status   │ Timestamp         │");
  console.log("    ├────────────────────────────┼──────────┼───────────────────┤");

  for (const consent of allConsents) {
    const status = consent.isValid ? "Active" : "Revoked";
    const timestamp = new Date(Number(consent.timestamp) * 1000).toLocaleString().slice(0, 17);
    const purpose = consent.purpose.length > 26 ? consent.purpose.slice(0, 23) + "..." : consent.purpose;
    const purposePad = " ".repeat(Math.max(0, 26 - purpose.length));
    const statusPad = " ".repeat(Math.max(0, 8 - status.length));

    console.log(`    │ ${purpose}${purposePad} │ ${status}${statusPad} │ ${timestamp} │`);
  }

  console.log("    └────────────────────────────┴──────────┴───────────────────┘");

  // Step 8: Bulk opt-out option
  console.log("\n>>> Step 8: Bulk opt-out demonstration");
  console.log("    [User clicks 'Opt out of all marketing']\n");

  const currentConsents = await consentReceipt.getUserConsents(user.address);
  let revokedCount = 0;

  for (let i = 0; i < currentConsents.length; i++) {
    if (currentConsents[i].isValid) {
      await consentReceipt.connect(user).revokeConsent(i);
      revokedCount++;
    }
  }

  console.log(`    ✓ Revoked ${revokedCount} active consents`);

  // Step 9: Final status
  console.log("\n>>> Step 9: Final preference status\n");

  console.log("    All Preferences After Bulk Opt-Out:");
  console.log("    ─────────────────────────────────────────────────────");

  let allOff = true;
  for (const [, pref] of Object.entries(PREFERENCES)) {
    const hasConsent = await consentReceipt.getConsentStatus(user.address, pref.key);
    if (hasConsent) allOff = false;
    const checkbox = hasConsent ? "☑" : "☐";
    const padding = " ".repeat(Math.max(0, 28 - pref.name.length));
    console.log(`      ${checkbox} ${pref.name}${padding}`);
  }

  console.log();
  console.log(`    All marketing preferences disabled: ${allOff ? "YES ✓" : "NO"}`);

  // === PREFERENCE CENTER SUMMARY ===

  console.log("\n" + "-".repeat(60));
  console.log("  Preference Center Summary");
  console.log("-".repeat(60));

  const totalConsents = await consentReceipt.getUserConsentsCount(user.address);

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           PREFERENCE CENTER REPORT                      │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log(`    │  User: ${user.address.slice(0, 30)}...               │`);
  console.log(`    │  Report Date: ${new Date().toLocaleString()}            │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  STATISTICS                                             │");
  console.log(`    │  • Total consent records: ${totalConsents}                              │`);

  const finalConsents = await consentReceipt.getUserConsents(user.address);
  const activeCount = finalConsents.filter(c => c.isValid).length;
  const revokedTotal = finalConsents.filter(c => !c.isValid).length;

  console.log(`    │  • Active consents: ${activeCount}                                     │`);
  console.log(`    │  • Revoked consents: ${revokedTotal}                                    │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  FEATURES DEMONSTRATED                                  │");
  console.log("    │  ✓ View all preferences by category                    │");
  console.log("    │  ✓ Enable/disable individual preferences               │");
  console.log("    │  ✓ Bulk enable (all communication)                     │");
  console.log("    │  ✓ Bulk disable (opt out of all marketing)             │");
  console.log("    │  ✓ Export consent history                              │");
  console.log("    │  ✓ Complete audit trail preserved                      │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Central place for all privacy preferences");
  console.log("  • Organized by category for easy navigation");
  console.log("  • Individual and bulk consent management");
  console.log("  • Export feature for data portability");
  console.log("  • Complete history preserved for compliance");
  console.log("  • Easy opt-out of all marketing at once");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
