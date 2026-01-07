/**
 * Example: Cookie Consent
 * Scenario: Marketing
 * Persona: Website Visitors, Developers, Compliance Officers
 *
 * This example demonstrates:
 * - Multi-category cookie consent
 * - Granular per-category control
 * - ePrivacy Directive compliance
 * - Cookie preference management
 *
 * Scenario:
 * User visits website and sees cookie banner:
 * 1. Essential cookies (no consent needed)
 * 2. Analytics cookies (opt-in)
 * 3. Marketing cookies (opt-in)
 * 4. Personalization cookies (opt-in)
 * User selects preferences and they are recorded.
 *
 * Run with:
 * npx hardhat run examples/04-marketing/02-cookie-consent.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Marketing Example: Cookie Consent");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up cookie consent scenario...\n");

  const [deployer, visitor, website] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Website Visitor:  ${visitor.address.slice(0, 10)}...`);
  console.log(`  Website:          ${website.address.slice(0, 10)}...`);

  // Deploy ConsentReceipt
  const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceiptFactory.deploy();
  await consentReceipt.waitForDeployment();

  console.log(`\nConsentReceipt deployed at: ${await consentReceipt.getAddress()}`);

  // Get current time
  const block = await ethers.provider.getBlock("latest");
  const currentTime = block!.timestamp;

  // Define cookie categories
  const COOKIE_CATEGORIES = {
    ESSENTIAL: "cookies_essential",
    ANALYTICS: "cookies_analytics",
    MARKETING: "cookies_marketing",
    PERSONALIZATION: "cookies_personalization",
    SOCIAL_MEDIA: "cookies_social_media"
  };

  // Cookie category descriptions
  const categoryDescriptions: { [key: string]: { name: string; required: boolean; description: string } } = {
    [COOKIE_CATEGORIES.ESSENTIAL]: {
      name: "Essential",
      required: true,
      description: "Required for website functionality"
    },
    [COOKIE_CATEGORIES.ANALYTICS]: {
      name: "Analytics",
      required: false,
      description: "Help us understand how visitors use the site"
    },
    [COOKIE_CATEGORIES.MARKETING]: {
      name: "Marketing",
      required: false,
      description: "Used for advertising and retargeting"
    },
    [COOKIE_CATEGORIES.PERSONALIZATION]: {
      name: "Personalization",
      required: false,
      description: "Remember your preferences and settings"
    },
    [COOKIE_CATEGORIES.SOCIAL_MEDIA]: {
      name: "Social Media",
      required: false,
      description: "Enable sharing and social features"
    }
  };

  // === SCENARIO ===

  // Step 1: User visits website, sees cookie banner
  console.log("\n>>> Step 1: User visits website, sees cookie banner\n");

  console.log("    ╔═══════════════════════════════════════════════════════╗");
  console.log("    ║           🍪 Cookie Consent Required                   ║");
  console.log("    ╠═══════════════════════════════════════════════════════╣");
  console.log("    ║  We use cookies to improve your experience.           ║");
  console.log("    ║  Please select your preferences:                       ║");
  console.log("    ╠═══════════════════════════════════════════════════════╣");

  for (const [key, info] of Object.entries(categoryDescriptions)) {
    const required = info.required ? "[Required]" : "[Optional]";
    console.log(`    ║  ${info.required ? "☑" : "☐"} ${info.name} ${required}`);
    console.log(`    ║     ${info.description}`);
  }

  console.log("    ╠═══════════════════════════════════════════════════════╣");
  console.log("    ║  [Accept All]  [Accept Selected]  [Reject Optional]   ║");
  console.log("    ╚═══════════════════════════════════════════════════════╝");

  // Step 2: User accepts analytics and personalization
  console.log("\n>>> Step 2: User selects preferences");
  console.log("    User accepts: Analytics, Personalization");
  console.log("    User rejects: Marketing, Social Media\n");

  // One year expiration for cookie consent
  const oneYear = 365 * 24 * 60 * 60;
  const cookieExpiry = currentTime + oneYear;

  // Essential cookies don't need consent but we record for completeness
  // (In reality, essential cookies can be set without consent)

  // Record accepted consents
  await consentReceipt.connect(visitor)["giveConsent(string,uint256)"](
    COOKIE_CATEGORIES.ANALYTICS,
    cookieExpiry
  );
  console.log("    ✓ Analytics cookies: ACCEPTED");

  await consentReceipt.connect(visitor)["giveConsent(string,uint256)"](
    COOKIE_CATEGORIES.PERSONALIZATION,
    cookieExpiry
  );
  console.log("    ✓ Personalization cookies: ACCEPTED");

  console.log("    ✗ Marketing cookies: REJECTED (no consent given)");
  console.log("    ✗ Social Media cookies: REJECTED (no consent given)");

  // Step 3: Website checks consent before setting cookies
  console.log("\n>>> Step 3: Website checks consent before setting cookies");

  console.log("\n    Cookie loading check:");

  for (const [key, info] of Object.entries(categoryDescriptions)) {
    if (info.required) {
      console.log(`      ${info.name}: ✓ LOAD (essential, no consent needed)`);
    } else {
      const hasConsent = await consentReceipt.getConsentStatus(visitor.address, key);
      const action = hasConsent ? "✓ LOAD (consent given)" : "✗ BLOCK (no consent)";
      console.log(`      ${info.name}: ${action}`);
    }
  }

  // Step 4: User changes preferences later
  console.log("\n>>> Step 4: User changes preferences (accepts marketing)");
  console.log("    User clicks 'Cookie Settings' in footer.\n");

  await consentReceipt.connect(visitor)["giveConsent(string,uint256)"](
    COOKIE_CATEGORIES.MARKETING,
    cookieExpiry
  );
  console.log("    ✓ Marketing cookies: NOW ACCEPTED");

  // Step 5: View all cookie preferences
  console.log("\n>>> Step 5: View current cookie preferences");

  console.log("\n    Current Cookie Settings:");
  console.log("    ─────────────────────────────────────────────────────");

  for (const [key, info] of Object.entries(categoryDescriptions)) {
    let status: string;
    if (info.required) {
      status = "ALWAYS ON (essential)";
    } else {
      const hasConsent = await consentReceipt.getConsentStatus(visitor.address, key);
      status = hasConsent ? "ON" : "OFF";
    }
    const padding = " ".repeat(Math.max(0, 18 - info.name.length));
    console.log(`      ${info.name}:${padding}${status}`);
  }

  // Step 6: User withdraws analytics consent
  console.log("\n>>> Step 6: User withdraws analytics consent");

  const consents = await consentReceipt.getUserConsents(visitor.address);
  let analyticsIndex = -1;
  for (let i = 0; i < consents.length; i++) {
    if (consents[i].purpose === COOKIE_CATEGORIES.ANALYTICS && consents[i].isValid) {
      analyticsIndex = i;
      break;
    }
  }

  if (analyticsIndex >= 0) {
    await consentReceipt.connect(visitor).revokeConsent(analyticsIndex);
    console.log("    ✓ Analytics cookies: WITHDRAWN");
    console.log("    (Analytics tracking will stop on next page load)");
  }

  // Step 7: Final consent status
  console.log("\n>>> Step 7: Final cookie consent status");

  console.log("\n    ┌───────────────────┬────────────┬──────────────────┐");
  console.log("    │ Cookie Category   │ Status     │ Expiry           │");
  console.log("    ├───────────────────┼────────────┼──────────────────┤");

  for (const [key, info] of Object.entries(categoryDescriptions)) {
    let status: string;
    let expiry: string;

    if (info.required) {
      status = "Required";
      expiry = "N/A";
    } else {
      const hasConsent = await consentReceipt.getConsentStatus(visitor.address, key);
      status = hasConsent ? "Accepted" : "Rejected";

      if (hasConsent) {
        const userConsents = await consentReceipt.getUserConsents(visitor.address);
        for (const c of userConsents) {
          if (c.purpose === key && c.isValid) {
            expiry = c.expiryTime === 0n
              ? "Never"
              : new Date(Number(c.expiryTime) * 1000).toLocaleDateString();
            break;
          }
        }
      } else {
        expiry = "N/A";
      }
    }

    const namePad = " ".repeat(Math.max(0, 17 - info.name.length));
    const statusPad = " ".repeat(Math.max(0, 10 - status.length));
    console.log(`    │ ${info.name}${namePad} │ ${status}${statusPad} │ ${expiry || "N/A"}           │`);
  }

  console.log("    └───────────────────┴────────────┴──────────────────┘");

  // === COMPLIANCE REPORT ===

  console.log("\n" + "-".repeat(60));
  console.log("  Cookie Consent Compliance Report");
  console.log("-".repeat(60));

  const allConsents = await consentReceipt.getUserConsents(visitor.address);

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           COOKIE CONSENT COMPLIANCE RECORD              │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log(`    │  Visitor ID: ${visitor.address.slice(0, 30)}...        │`);
  console.log(`    │  Report Date: ${new Date().toLocaleString()}            │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  CONSENT HISTORY                                        │");

  for (const consent of allConsents) {
    const status = consent.isValid ? "ACTIVE" : "WITHDRAWN";
    const timestamp = new Date(Number(consent.timestamp) * 1000).toLocaleString();
    console.log(`    │    ${consent.purpose.slice(0, 25)}`);
    console.log(`    │      Status: ${status}, Recorded: ${timestamp.slice(0, 10)}`);
  }

  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  ePRIVACY COMPLIANCE                                    │");
  console.log("    │  ✓ Prior consent obtained before optional cookies       │");
  console.log("    │  ✓ Granular per-category control provided              │");
  console.log("    │  ✓ Easy mechanism to withdraw consent                  │");
  console.log("    │  ✓ Consent timestamps recorded                         │");
  console.log("    │  ✓ Consent renewal required (12 months)                │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Essential cookies don't require consent");
  console.log("  • Optional cookies require explicit opt-in");
  console.log("  • Granular control per cookie category");
  console.log("  • Users can change preferences at any time");
  console.log("  • Consent withdrawal stops cookie loading");
  console.log("  • Annual renewal recommended for cookie consent");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
