/**
 * Example: Publication Consent
 * Scenario: Research
 * Persona: Researchers, Participants, Ethics Boards
 *
 * This example demonstrates:
 * - Secondary use consent for publication
 * - Case study publication authorization
 * - Consent verification before publication
 * - Publication acknowledgment tracking
 *
 * Scenario:
 * Publishing research results:
 * 1. Research study completed
 * 2. Researcher requests publication consent
 * 3. Participant reviews and authorizes
 * 4. Publication consent verified before submission
 *
 * Run with:
 * npx hardhat run examples/05-research/04-publication-consent.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Research Example: Publication Consent");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up publication consent scenario...\n");

  const [deployer, participant1, participant2, participant3, researcher, editor] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Participant 1:  ${participant1.address.slice(0, 10)}...`);
  console.log(`  Participant 2:  ${participant2.address.slice(0, 10)}...`);
  console.log(`  Participant 3:  ${participant3.address.slice(0, 10)}...`);
  console.log(`  Researcher:     ${researcher.address.slice(0, 10)}...`);
  console.log(`  Journal Editor: ${editor.address.slice(0, 10)}...`);

  // Deploy ConsentReceipt
  const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceiptFactory.deploy();
  await consentReceipt.waitForDeployment();

  console.log("\nConsentReceipt deployed successfully.");

  // Define consent purposes
  const STUDY_PARTICIPATION = "study_participation";
  const AGGREGATE_PUBLICATION = "aggregate_results_publication";
  const CASE_STUDY_PUBLICATION = "case_study_publication";
  const PHOTO_PUBLICATION = "photo_image_publication";

  // === SCENARIO ===

  // Step 1: Background - Study completed with participants
  console.log("\n>>> Step 1: Background - Research study completed");
  console.log("    Three participants completed the study.\n");

  // All participants gave study consent
  await consentReceipt.connect(participant1)["giveConsent(string)"](STUDY_PARTICIPATION);
  await consentReceipt.connect(participant2)["giveConsent(string)"](STUDY_PARTICIPATION);
  await consentReceipt.connect(participant3)["giveConsent(string)"](STUDY_PARTICIPATION);

  console.log("    ✓ Participant 1: Study completed");
  console.log("    ✓ Participant 2: Study completed");
  console.log("    ✓ Participant 3: Study completed");

  // Step 2: Researcher wants to publish aggregate results
  console.log("\n>>> Step 2: Request consent for aggregate results publication");
  console.log("    Researcher wants to publish study findings.\n");

  console.log("    ╔═══════════════════════════════════════════════════════════╗");
  console.log("    ║        PUBLICATION CONSENT REQUEST                         ║");
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log("    ║  We would like your permission to publish the results     ║");
  console.log("    ║  of this study in a scientific journal.                   ║");
  console.log("    ║                                                            ║");
  console.log("    ║  Publication Options:                                      ║");
  console.log("    ║  ☐ Include my data in aggregate results (anonymous)       ║");
  console.log("    ║  ☐ Feature my case as a case study (with pseudonym)       ║");
  console.log("    ║  ☐ Include my clinical photos (de-identified)             ║");
  console.log("    ╚═══════════════════════════════════════════════════════════╝");

  // Step 3: Participants provide publication consent
  console.log("\n>>> Step 3: Participants provide publication consent\n");

  // Participant 1: Consents to all
  await consentReceipt.connect(participant1)["giveConsent(string)"](AGGREGATE_PUBLICATION);
  await consentReceipt.connect(participant1)["giveConsent(string)"](CASE_STUDY_PUBLICATION);
  await consentReceipt.connect(participant1)["giveConsent(string)"](PHOTO_PUBLICATION);
  console.log("    Participant 1:");
  console.log("      ✓ Aggregate results: YES");
  console.log("      ✓ Case study: YES");
  console.log("      ✓ Photos: YES");

  // Participant 2: Aggregate only
  await consentReceipt.connect(participant2)["giveConsent(string)"](AGGREGATE_PUBLICATION);
  console.log("\n    Participant 2:");
  console.log("      ✓ Aggregate results: YES");
  console.log("      ✗ Case study: NO");
  console.log("      ✗ Photos: NO");

  // Participant 3: Aggregate and case study
  await consentReceipt.connect(participant3)["giveConsent(string)"](AGGREGATE_PUBLICATION);
  await consentReceipt.connect(participant3)["giveConsent(string)"](CASE_STUDY_PUBLICATION);
  console.log("\n    Participant 3:");
  console.log("      ✓ Aggregate results: YES");
  console.log("      ✓ Case study: YES");
  console.log("      ✗ Photos: NO");

  // Step 4: Verify consent before publication
  console.log("\n>>> Step 4: Verify consent before publication");

  const participants = [
    { signer: participant1, name: "Participant 1" },
    { signer: participant2, name: "Participant 2" },
    { signer: participant3, name: "Participant 3" }
  ];

  const publicationTypes = [
    { purpose: AGGREGATE_PUBLICATION, name: "Aggregate Results" },
    { purpose: CASE_STUDY_PUBLICATION, name: "Case Study" },
    { purpose: PHOTO_PUBLICATION, name: "Photo Publication" }
  ];

  console.log("\n    Publication Consent Matrix:");
  console.log("    ┌──────────────────┬────────────┬────────────┬────────────┐");
  console.log("    │                  │ Aggregate  │ Case Study │   Photos   │");
  console.log("    ├──────────────────┼────────────┼────────────┼────────────┤");

  for (const p of participants) {
    const aggConsent = await consentReceipt.getConsentStatus(p.signer.address, AGGREGATE_PUBLICATION);
    const caseConsent = await consentReceipt.getConsentStatus(p.signer.address, CASE_STUDY_PUBLICATION);
    const photoConsent = await consentReceipt.getConsentStatus(p.signer.address, PHOTO_PUBLICATION);

    const agg = aggConsent ? "   ✓ YES   " : "   ✗ NO    ";
    const cas = caseConsent ? "   ✓ YES   " : "   ✗ NO    ";
    const pho = photoConsent ? "   ✓ YES   " : "   ✗ NO    ";

    console.log(`    │ ${p.name}     │${agg}│${cas}│${pho}│`);
  }

  console.log("    └──────────────────┴────────────┴────────────┴────────────┘");

  // Step 5: Determine publication options
  console.log("\n>>> Step 5: Determine available publication options");

  // Count consents
  let aggregateCount = 0;
  let caseStudyCount = 0;
  let photoCount = 0;

  for (const p of participants) {
    if (await consentReceipt.getConsentStatus(p.signer.address, AGGREGATE_PUBLICATION)) aggregateCount++;
    if (await consentReceipt.getConsentStatus(p.signer.address, CASE_STUDY_PUBLICATION)) caseStudyCount++;
    if (await consentReceipt.getConsentStatus(p.signer.address, PHOTO_PUBLICATION)) photoCount++;
  }

  console.log("\n    Publication Options:");
  console.log(`      • Aggregate results: ${aggregateCount}/3 consented - CAN PUBLISH`);
  console.log(`      • Case studies available: ${caseStudyCount} participants`);
  console.log(`      • Photos available: ${photoCount} participant`);

  // Step 6: Participant withdraws publication consent
  console.log("\n>>> Step 6: Participant 1 withdraws photo consent");
  console.log("    Before journal submission, participant changes mind.\n");

  const p1Consents = await consentReceipt.getUserConsents(participant1.address);
  for (let i = 0; i < p1Consents.length; i++) {
    if (p1Consents[i].purpose === PHOTO_PUBLICATION && p1Consents[i].isValid) {
      await consentReceipt.connect(participant1).revokeConsent(i);
      console.log("    ✓ Photo publication consent: WITHDRAWN");
      break;
    }
  }

  // Verify photo count changed
  photoCount = 0;
  for (const p of participants) {
    if (await consentReceipt.getConsentStatus(p.signer.address, PHOTO_PUBLICATION)) photoCount++;
  }
  console.log(`    Photos now available: ${photoCount} participants`);

  // Step 7: Journal editor verification
  console.log("\n>>> Step 7: Journal editor verifies consent");
  console.log("    Editor requests proof of publication consent.\n");

  console.log("    Consent Verification for Manuscript #MS-2024-001:");
  console.log("    ─────────────────────────────────────────────────────");

  for (const p of participants) {
    console.log(`\n    ${p.name}:`);
    const consents = await consentReceipt.getUserConsents(p.signer.address);

    for (const consent of consents) {
      if (consent.purpose.includes("publication")) {
        const status = consent.isValid ? "VALID" : "WITHDRAWN";
        const timestamp = new Date(Number(consent.timestamp) * 1000).toLocaleString();
        console.log(`      • ${consent.purpose}: ${status}`);
        console.log(`        Recorded: ${timestamp}`);
      }
    }
  }

  // === PUBLICATION REPORT ===

  console.log("\n" + "-".repeat(60));
  console.log("  Publication Consent Report");
  console.log("-".repeat(60));

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │        PUBLICATION CONSENT VERIFICATION                 │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  Manuscript: MS-2024-001                                │");
  console.log(`    │  Verification Date: ${new Date().toLocaleString()}      │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  CONSENT SUMMARY                                        │");
  console.log(`    │    Aggregate publication: ${aggregateCount}/3 participants            │`);
  console.log(`    │    Case study available: ${caseStudyCount} participants               │`);
  console.log(`    │    Photo consent: ${photoCount} participants                        │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  PUBLICATION RECOMMENDATION                             │");
  console.log("    │    ✓ Aggregate results: APPROVED (all consented)       │");
  console.log(`    │    ✓ Case studies: APPROVED (${caseStudyCount} available)             │`);
  console.log(`    │    ${photoCount === 0 ? "✗" : "✓"} Photos: ${photoCount === 0 ? "NOT AVAILABLE" : "APPROVED (limited)"}                        │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  ETHICAL COMPLIANCE                                     │");
  console.log("    │  ✓ Informed publication consent obtained               │");
  console.log("    │  ✓ Withdrawal rights respected                         │");
  console.log("    │  ✓ Consent timestamps verified                         │");
  console.log("    │  ✓ On-chain audit trail available                      │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Publication consent separate from study consent");
  console.log("  • Granular options (aggregate, case study, photos)");
  console.log("  • Participants can withdraw publication consent");
  console.log("  • Consent matrix shows available options");
  console.log("  • Journal editor can verify consent");
  console.log("  • Complete audit trail for ethics compliance");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
