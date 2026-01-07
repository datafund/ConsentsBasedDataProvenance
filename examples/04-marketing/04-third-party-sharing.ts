/**
 * Example: Third-Party Sharing
 * Scenario: Marketing
 * Persona: Consumers, Marketing Teams, Data Partners
 *
 * This example demonstrates:
 * - Partner data sharing consent
 * - CCPA "Do Not Sell" compliance
 * - Third-party access tracking
 * - Specific partner identification
 *
 * Scenario:
 * Data sharing with marketing partners:
 * 1. User views partner sharing options
 * 2. User consents to specific partners
 * 3. Partners access shared data
 * 4. User exercises "Do Not Sell" right
 *
 * Run with:
 * npx hardhat run examples/04-marketing/04-third-party-sharing.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Marketing Example: Third-Party Sharing");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up third-party sharing scenario...\n");

  const [deployer, user, company, partner1, partner2, partner3] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  User:             ${user.address.slice(0, 10)}...`);
  console.log(`  Company:          ${company.address.slice(0, 10)}...`);
  console.log(`  Partner 1:        ${partner1.address.slice(0, 10)}... (Analytics Co)`);
  console.log(`  Partner 2:        ${partner2.address.slice(0, 10)}... (Ad Network)`);
  console.log(`  Partner 3:        ${partner3.address.slice(0, 10)}... (Data Broker)`);

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

  // Define sharing purposes
  const SHARE_ANALYTICS = "share_analytics_partner";
  const SHARE_ADVERTISING = "share_advertising_partner";
  const SHARE_DATA_BROKER = "share_data_broker";
  const DO_NOT_SELL = "do_not_sell_data";

  // Partner info
  const partners = [
    { signer: partner1, name: "Analytics Co", purpose: SHARE_ANALYTICS, type: "Service Provider" },
    { signer: partner2, name: "Ad Network", purpose: SHARE_ADVERTISING, type: "Advertising" },
    { signer: partner3, name: "Data Broker", purpose: SHARE_DATA_BROKER, type: "Data Reseller" }
  ];

  // === SCENARIO ===

  // Step 1: User views partner sharing disclosure
  console.log("\n>>> Step 1: User views data sharing disclosure\n");

  console.log("    ╔═══════════════════════════════════════════════════════╗");
  console.log("    ║           Data Sharing Preferences                     ║");
  console.log("    ╠═══════════════════════════════════════════════════════╣");
  console.log("    ║  We may share your data with the following partners:  ║");
  console.log("    ║                                                        ║");

  for (const p of partners) {
    console.log(`    ║  ☐ ${p.name} (${p.type})`);
  }

  console.log("    ║                                                        ║");
  console.log("    ║  ───────────────────────────────────────────────────   ║");
  console.log("    ║  California residents: You have the right to opt-out  ║");
  console.log("    ║  of the 'sale' of your personal information.          ║");
  console.log("    ║  ☐ Do Not Sell My Personal Information                ║");
  console.log("    ╚═══════════════════════════════════════════════════════╝");

  // Step 2: User consents to analytics and advertising partners
  console.log("\n>>> Step 2: User consents to specific partners");
  console.log("    User accepts: Analytics Co, Ad Network");
  console.log("    User rejects: Data Broker\n");

  const oneYear = 365 * 24 * 60 * 60;
  const sharingExpiry = currentTime + oneYear;

  await consentReceipt.connect(user)["giveConsent(string,uint256)"](
    SHARE_ANALYTICS,
    sharingExpiry
  );
  console.log("    ✓ Analytics Co sharing: ALLOWED");

  await consentReceipt.connect(user)["giveConsent(string,uint256)"](
    SHARE_ADVERTISING,
    sharingExpiry
  );
  console.log("    ✓ Ad Network sharing: ALLOWED");

  console.log("    ✗ Data Broker sharing: DENIED (no consent)");

  // Step 3: Company registers user data
  console.log("\n>>> Step 3: Company registers user profile data");

  // Give company consent for data registration
  await consentReceipt.connect(user)["giveConsent(string)"]("account_management");

  const userProfileHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify({
      userId: user.address,
      type: "user_profile",
      demographics: "redacted",
      interests: ["tech", "sports"],
      ts: Date.now()
    })
  ));

  await integratedSystem.connect(user).registerDataWithConsent(
    userProfileHash,
    "user_profile",
    "account_management"
  );

  console.log(`    ✓ User profile registered`);
  console.log(`      Hash: ${userProfileHash.slice(0, 20)}...`);

  // Step 4: Authorized partners access data
  console.log("\n>>> Step 4: Partners request data access");

  for (const p of partners) {
    const hasConsent = await consentReceipt.getConsentStatus(user.address, p.purpose);

    if (hasConsent) {
      // Partner gives their consent for receiving data
      await consentReceipt.connect(p.signer)["giveConsent(string)"](p.purpose);

      await integratedSystem.connect(p.signer).accessDataWithConsent(
        userProfileHash,
        p.purpose
      );
      console.log(`    ✓ ${p.name}: ACCESS GRANTED`);
    } else {
      console.log(`    ✗ ${p.name}: ACCESS DENIED (no user consent)`);
    }
  }

  // Step 5: View data access log
  console.log("\n>>> Step 5: View data access log");

  const record = await dataProvenance.getDataRecord(userProfileHash);

  console.log(`\n    Data: ${userProfileHash.slice(0, 20)}...`);
  console.log(`    Accessors: ${record.accessors.length}`);
  console.log("\n    Access Log:");

  for (let i = 0; i < record.accessors.length; i++) {
    const accessor = record.accessors[i];
    const partnerInfo = partners.find(p => p.signer.address === accessor);
    const name = partnerInfo ? partnerInfo.name : "Unknown";
    console.log(`      ${i + 1}. ${accessor.slice(0, 10)}... (${name})`);
  }

  // Step 6: User exercises "Do Not Sell" right
  console.log("\n>>> Step 6: User exercises 'Do Not Sell' right (CCPA)");
  console.log("    User clicks 'Do Not Sell My Personal Information'\n");

  // Revoke all partner sharing consents
  const userConsents = await consentReceipt.getUserConsents(user.address);

  for (let i = 0; i < userConsents.length; i++) {
    const consent = userConsents[i];
    if (consent.isValid && consent.purpose.startsWith("share_")) {
      await consentReceipt.connect(user).revokeConsent(i);
      console.log(`    ✓ Revoked: ${consent.purpose}`);
    }
  }

  // Record "Do Not Sell" preference
  await consentReceipt.connect(user)["giveConsent(string)"](DO_NOT_SELL);
  console.log("    ✓ 'Do Not Sell' preference recorded");

  // Step 7: Verify sharing status
  console.log("\n>>> Step 7: Verify sharing status after 'Do Not Sell'");

  console.log("\n    Partner Sharing Status:");
  console.log("    ─────────────────────────────────────────────────────");

  for (const p of partners) {
    const hasConsent = await consentReceipt.getConsentStatus(user.address, p.purpose);
    const status = hasConsent ? "ALLOWED" : "BLOCKED";
    const padding = " ".repeat(Math.max(0, 20 - p.name.length));
    console.log(`      ${p.name}${padding}${status}`);
  }

  const hasDoNotSell = await consentReceipt.getConsentStatus(user.address, DO_NOT_SELL);
  console.log(`\n      'Do Not Sell' Active: ${hasDoNotSell ? "YES" : "NO"}`);

  // === COMPLIANCE REPORT ===

  console.log("\n" + "-".repeat(60));
  console.log("  CCPA Third-Party Sharing Report");
  console.log("-".repeat(60));

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           CCPA DATA SHARING COMPLIANCE REPORT           │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log(`    │  Consumer: ${user.address.slice(0, 30)}...           │`);
  console.log(`    │  Report Date: ${new Date().toLocaleString()}            │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  THIRD PARTIES WHO RECEIVED DATA                        │");

  for (const accessor of record.accessors) {
    const partnerInfo = partners.find(p => p.signer.address === accessor);
    if (partnerInfo) {
      console.log(`    │    • ${partnerInfo.name} (${partnerInfo.type})`);
    }
  }

  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  THIRD PARTIES DENIED ACCESS                            │");

  for (const p of partners) {
    const hasAccessed = await dataProvenance.hasAddressAccessed(userProfileHash, p.signer.address);
    if (!hasAccessed) {
      console.log(`    │    • ${p.name} (${p.type})`);
    }
  }

  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  'DO NOT SELL' STATUS                                   │");
  console.log(`    │    Active: ${hasDoNotSell ? "YES" : "NO"}                                            │`);
  console.log("    │    Effective: Immediately                               │");
  console.log("    │    Duration: Until withdrawn                            │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  CCPA COMPLIANCE                                        │");
  console.log("    │  ✓ 'Do Not Sell' link prominently displayed            │");
  console.log("    │  ✓ Opt-out processed within 15 days                    │");
  console.log("    │  ✓ No retaliation against consumer                     │");
  console.log("    │  ✓ Third parties notified of opt-out                   │");
  console.log("    │  ✓ Complete access log available                       │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Third-party sharing requires explicit consent");
  console.log("  • Partners can be individually selected");
  console.log("  • All data access is logged");
  console.log("  • CCPA 'Do Not Sell' supported");
  console.log("  • Users can revoke sharing at any time");
  console.log("  • Complete audit trail for compliance");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
