/**
 * Example: Personalization
 * Scenario: Marketing
 * Persona: Consumers, Marketing Teams, Ad Tech
 *
 * This example demonstrates:
 * - Ad personalization consent
 * - Interest-based advertising consent
 * - Cross-site tracking consent
 * - User preference management
 *
 * Scenario:
 * User consents to personalized advertising:
 * 1. User opts into interest tracking
 * 2. Interests recorded for personalization
 * 3. Ad networks access data (with consent)
 * 4. User opts out of personalization
 *
 * Run with:
 * npx hardhat run examples/04-marketing/03-personalization.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Marketing Example: Personalization");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up personalization scenario...\n");

  const [deployer, user, adPlatform, adNetwork1, adNetwork2] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  User:               ${user.address.slice(0, 10)}...`);
  console.log(`  Ad Platform:        ${adPlatform.address.slice(0, 10)}...`);
  console.log(`  Ad Network 1:       ${adNetwork1.address.slice(0, 10)}...`);
  console.log(`  Ad Network 2:       ${adNetwork2.address.slice(0, 10)}...`);

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

  // Get current time
  const block = await ethers.provider.getBlock("latest");
  const currentTime = block!.timestamp;

  // Define personalization purposes
  const INTEREST_TRACKING = "personalization_interests";
  const AD_PERSONALIZATION = "ad_personalization";
  const CROSS_SITE_TRACKING = "cross_site_tracking";
  const BEHAVIORAL_ADS = "behavioral_advertising";

  // === SCENARIO ===

  // Step 1: User views personalization consent dialog
  console.log("\n>>> Step 1: User sees personalization consent dialog\n");

  console.log("    ╔═══════════════════════════════════════════════════════╗");
  console.log("    ║         Personalize Your Experience                    ║");
  console.log("    ╠═══════════════════════════════════════════════════════╣");
  console.log("    ║  We'd like to show you more relevant content and ads.  ║");
  console.log("    ║                                                        ║");
  console.log("    ║  ☐ Track my interests to improve recommendations      ║");
  console.log("    ║  ☐ Show me personalized advertisements                ║");
  console.log("    ║  ☐ Share data with ad partners                        ║");
  console.log("    ║  ☐ Track my activity across sites                     ║");
  console.log("    ║                                                        ║");
  console.log("    ║  [Accept All]  [Customize]  [Reject All]              ║");
  console.log("    ╚═══════════════════════════════════════════════════════╝");

  // Step 2: User opts into interest tracking and personalization
  console.log("\n>>> Step 2: User opts into selected personalization options");
  console.log("    User accepts: Interest tracking, Ad personalization");
  console.log("    User rejects: Cross-site tracking\n");

  const sixMonths = 180 * 24 * 60 * 60;
  const personalizationExpiry = currentTime + sixMonths;

  await consentReceipt.connect(user)["giveConsent(string,uint256)"](
    INTEREST_TRACKING,
    personalizationExpiry
  );
  console.log("    ✓ Interest tracking: ENABLED");

  await consentReceipt.connect(user)["giveConsent(string,uint256)"](
    AD_PERSONALIZATION,
    personalizationExpiry
  );
  console.log("    ✓ Ad personalization: ENABLED");

  console.log("    ✗ Cross-site tracking: DISABLED (no consent)");

  // Step 3: Record user interests (with consent)
  console.log("\n>>> Step 3: Track user interests (with valid consent)");

  // Verify consent before tracking
  const canTrack = await consentReceipt.getConsentStatus(user.address, INTEREST_TRACKING);
  console.log(`    Consent for interest tracking: ${canTrack ? "VALID" : "INVALID"}`);

  if (canTrack) {
    // User interests data
    const interestsHash = ethers.keccak256(ethers.toUtf8Bytes(
      JSON.stringify({
        userId: user.address,
        interests: ["technology", "travel", "cooking"],
        ts: Date.now()
      })
    ));

    await integratedSystem.connect(user).registerDataWithConsent(
      interestsHash,
      "user_interests",
      INTEREST_TRACKING
    );

    console.log("    ✓ User interests recorded");
    console.log(`      Hash: ${interestsHash.slice(0, 20)}...`);
    console.log("      Interests: technology, travel, cooking");
  }

  // Step 4: Ad platform accesses data for personalization
  console.log("\n>>> Step 4: Ad platform accesses data for personalization");

  // Ad platform needs consent
  await consentReceipt.connect(adPlatform)["giveConsent(string)"](AD_PERSONALIZATION);

  // Get user's registered data
  const userData = await integratedSystem.getUserRegisteredData(user.address);

  if (userData.length > 0) {
    await integratedSystem.connect(adPlatform).accessDataWithConsent(
      userData[0],
      AD_PERSONALIZATION
    );
    console.log("    ✓ Ad platform accessed user interests");

    // Verify access was logged
    const hasAccessed = await dataProvenance.hasAddressAccessed(userData[0], adPlatform.address);
    console.log(`    Access logged: ${hasAccessed}`);
  }

  // Step 5: Try cross-site tracking (should fail - no consent)
  console.log("\n>>> Step 5: Check cross-site tracking consent");

  const canCrossTrack = await consentReceipt.getConsentStatus(user.address, CROSS_SITE_TRACKING);
  console.log(`    Cross-site tracking consent: ${canCrossTrack ? "ALLOWED" : "DENIED"}`);
  console.log("    (User declined cross-site tracking - cannot proceed)");

  // Step 6: View personalization settings
  console.log("\n>>> Step 6: View personalization settings");

  const settings = [
    { purpose: INTEREST_TRACKING, name: "Interest Tracking" },
    { purpose: AD_PERSONALIZATION, name: "Ad Personalization" },
    { purpose: CROSS_SITE_TRACKING, name: "Cross-site Tracking" },
    { purpose: BEHAVIORAL_ADS, name: "Behavioral Ads" }
  ];

  console.log("\n    Personalization Settings:");
  console.log("    ─────────────────────────────────────────────────────");

  for (const setting of settings) {
    const enabled = await consentReceipt.getConsentStatus(user.address, setting.purpose);
    const status = enabled ? "☑ ON" : "☐ OFF";
    const padding = " ".repeat(Math.max(0, 25 - setting.name.length));
    console.log(`      ${setting.name}${padding}${status}`);
  }

  // Step 7: User opts out of all personalization
  console.log("\n>>> Step 7: User opts out of personalization");
  console.log("    User clicks 'Opt out of personalized ads'\n");

  const userConsents = await consentReceipt.getUserConsents(user.address);

  for (let i = 0; i < userConsents.length; i++) {
    if (userConsents[i].isValid) {
      await consentReceipt.connect(user).revokeConsent(i);
      console.log(`    ✓ ${userConsents[i].purpose}: DISABLED`);
    }
  }

  // Step 8: Verify personalization is disabled
  console.log("\n>>> Step 8: Verify personalization is disabled");

  console.log("\n    Final Personalization Settings:");
  console.log("    ─────────────────────────────────────────────────────");

  for (const setting of settings) {
    const enabled = await consentReceipt.getConsentStatus(user.address, setting.purpose);
    const status = enabled ? "☑ ON" : "☐ OFF";
    const padding = " ".repeat(Math.max(0, 25 - setting.name.length));
    console.log(`      ${setting.name}${padding}${status}`);
  }

  // === DATA ACCESS SUMMARY ===

  console.log("\n" + "-".repeat(60));
  console.log("  Personalization Data Access Summary");
  console.log("-".repeat(60));

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           PERSONALIZATION CONSENT RECORD                │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log(`    │  User: ${user.address.slice(0, 30)}...               │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  DATA ACCESS LOG                                        │");

  if (userData.length > 0) {
    const record = await dataProvenance.getDataRecord(userData[0]);
    console.log(`    │  • Interest data accessed by ${record.accessors.length} parties            │`);
    console.log("    │    - Ad Platform: ✓                                   │");
  }

  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  CURRENT STATUS                                         │");
  console.log("    │  • Personalization: DISABLED (user opted out)          │");
  console.log("    │  • Historical data: Retained for audit                 │");
  console.log("    │  • Future tracking: Blocked                            │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  COMPLIANCE                                             │");
  console.log("    │  ✓ Explicit opt-in required                            │");
  console.log("    │  ✓ Easy opt-out mechanism provided                     │");
  console.log("    │  ✓ All data access logged                              │");
  console.log("    │  ✓ Consent withdrawal effective immediately            │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Personalization requires explicit consent");
  console.log("  • Granular control over tracking types");
  console.log("  • Data access logged for transparency");
  console.log("  • Users can opt out at any time");
  console.log("  • Consent withdrawal stops future tracking");
  console.log("  • Supports GDPR and CCPA requirements");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
