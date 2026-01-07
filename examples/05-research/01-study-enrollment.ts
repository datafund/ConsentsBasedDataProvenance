/**
 * Example: Study Enrollment
 * Scenario: Research
 * Persona: Research Participants, Researchers, IRB
 *
 * This example demonstrates:
 * - Informed consent process for research
 * - Multi-purpose research consent
 * - Optional consent components
 * - Participant withdrawal workflow
 *
 * Scenario:
 * Participant enrolls in clinical research study:
 * 1. Informed consent explained
 * 2. Consent for study procedures
 * 3. Optional consent for sample banking
 * 4. Participant exercises right to withdraw
 *
 * Run with:
 * npx hardhat run examples/05-research/01-study-enrollment.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Research Example: Study Enrollment");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up study enrollment scenario...\n");

  const [deployer, participant, principalInvestigator, researchCoordinator] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Participant:            ${participant.address.slice(0, 10)}...`);
  console.log(`  Principal Investigator: ${principalInvestigator.address.slice(0, 10)}...`);
  console.log(`  Research Coordinator:   ${researchCoordinator.address.slice(0, 10)}...`);

  // Deploy KantaraConsentReceipt for detailed consent
  const KantaraFactory = await ethers.getContractFactory("KantaraConsentReceipt");
  const kantaraConsent = await KantaraFactory.deploy();
  await kantaraConsent.waitForDeployment();

  // Deploy basic ConsentReceipt for simpler tracking
  const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceiptFactory.deploy();
  await consentReceipt.waitForDeployment();

  console.log("\nContracts deployed successfully.");

  // Study information
  const studyId = "STUDY-2024-001";
  const studyTitle = "Longitudinal Health Outcomes Study";

  // Get current time
  const block = await ethers.provider.getBlock("latest");
  const currentTime = block!.timestamp;

  // Define consent purposes
  const STUDY_PARTICIPATION = "study_participation";
  const DATA_COLLECTION = "research_data_collection";
  const SAMPLE_STORAGE = "biospecimen_banking";
  const FUTURE_RESEARCH = "future_research_use";
  const GENETIC_ANALYSIS = "genetic_analysis";

  // === SCENARIO ===

  // Step 1: Informed consent process
  console.log("\n>>> Step 1: Informed Consent Process");
  console.log(`    Study: ${studyTitle} (${studyId})\n`);

  console.log("    ╔═══════════════════════════════════════════════════════════╗");
  console.log("    ║              INFORMED CONSENT DOCUMENT                     ║");
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log("    ║  Study Title: Longitudinal Health Outcomes Study          ║");
  console.log("    ║  IRB Approval: #IRB-2024-001                              ║");
  console.log("    ║  Principal Investigator: Dr. Research                     ║");
  console.log("    ║                                                            ║");
  console.log("    ║  By signing, you agree to:                                ║");
  console.log("    ║  [Required]                                                ║");
  console.log("    ║    ☐ Participate in study procedures                      ║");
  console.log("    ║    ☐ Allow collection of health data                      ║");
  console.log("    ║                                                            ║");
  console.log("    ║  [Optional]                                                ║");
  console.log("    ║    ☐ Store samples for future research                    ║");
  console.log("    ║    ☐ Allow genetic analysis                               ║");
  console.log("    ║    ☐ Be contacted for future studies                      ║");
  console.log("    ╚═══════════════════════════════════════════════════════════╝");

  // Step 2: Participant gives required consents
  console.log("\n>>> Step 2: Participant gives required consents");

  // Study duration: 2 years
  const twoYears = 2 * 365 * 24 * 60 * 60;
  const studyEndDate = currentTime + twoYears;

  await consentReceipt.connect(participant)["giveConsent(string,uint256)"](
    STUDY_PARTICIPATION,
    studyEndDate
  );
  console.log("    ✓ Study participation consent recorded");
  console.log(`      Study ends: ${new Date(studyEndDate * 1000).toLocaleDateString()}`);

  await consentReceipt.connect(participant)["giveConsent(string,uint256)"](
    DATA_COLLECTION,
    studyEndDate
  );
  console.log("    ✓ Data collection consent recorded");

  // Step 3: Participant gives optional consents
  console.log("\n>>> Step 3: Participant gives optional consents");
  console.log("    Participant chooses: Sample storage YES, Genetic analysis NO\n");

  // Long-term sample storage (no expiry)
  await consentReceipt.connect(participant)["giveConsent(string)"](SAMPLE_STORAGE);
  console.log("    ✓ Sample storage consent (indefinite duration)");

  // Genetic analysis - participant declines
  console.log("    ✗ Genetic analysis: DECLINED (no consent given)");

  // Future research contact
  await consentReceipt.connect(participant)["giveConsent(string)"](FUTURE_RESEARCH);
  console.log("    ✓ Future research contact consent");

  // Step 4: Verify enrollment status
  console.log("\n>>> Step 4: Verify enrollment status");

  const consentChecks = [
    { purpose: STUDY_PARTICIPATION, name: "Study Participation", required: true },
    { purpose: DATA_COLLECTION, name: "Data Collection", required: true },
    { purpose: SAMPLE_STORAGE, name: "Sample Storage", required: false },
    { purpose: GENETIC_ANALYSIS, name: "Genetic Analysis", required: false },
    { purpose: FUTURE_RESEARCH, name: "Future Research", required: false }
  ];

  console.log("\n    Enrollment Verification:");
  console.log("    ─────────────────────────────────────────────────────");

  let allRequiredConsents = true;
  for (const check of consentChecks) {
    const hasConsent = await consentReceipt.getConsentStatus(participant.address, check.purpose);
    const reqTag = check.required ? "[Required]" : "[Optional]";
    const status = hasConsent ? "✓ CONSENTED" : "✗ DECLINED";

    if (check.required && !hasConsent) allRequiredConsents = false;

    console.log(`      ${reqTag} ${check.name}: ${status}`);
  }

  console.log(`\n    Enrollment status: ${allRequiredConsents ? "ENROLLED ✓" : "INCOMPLETE"}`);

  // Step 5: View detailed consent records
  console.log("\n>>> Step 5: View participant consent records");

  const consents = await consentReceipt.getUserConsents(participant.address);

  console.log(`\n    Participant has ${consents.length} consent records:\n`);

  for (let i = 0; i < consents.length; i++) {
    const consent = consents[i];
    const expiryText = consent.expiryTime === 0n
      ? "Indefinite"
      : new Date(Number(consent.expiryTime) * 1000).toLocaleDateString();

    console.log(`    [${i}] ${consent.purpose}`);
    console.log(`        Status: ${consent.isValid ? "ACTIVE" : "WITHDRAWN"}`);
    console.log(`        Signed: ${new Date(Number(consent.timestamp) * 1000).toLocaleString()}`);
    console.log(`        Expires: ${expiryText}`);
    console.log();
  }

  // Step 6: Participant partially withdraws
  console.log(">>> Step 6: Participant withdraws from sample storage");
  console.log("    Participant exercises right to modify consent.\n");

  // Find and revoke sample storage consent
  for (let i = 0; i < consents.length; i++) {
    if (consents[i].purpose === SAMPLE_STORAGE && consents[i].isValid) {
      await consentReceipt.connect(participant).revokeConsent(i);
      console.log("    ✓ Sample storage consent: WITHDRAWN");
      break;
    }
  }

  // Verify other consents still active
  const stillParticipating = await consentReceipt.getConsentStatus(participant.address, STUDY_PARTICIPATION);
  console.log(`    Study participation: ${stillParticipating ? "STILL ACTIVE" : "WITHDRAWN"}`);

  // Step 7: Full withdrawal demonstration
  console.log("\n>>> Step 7: Participant fully withdraws from study");
  console.log("    (Demonstrating complete withdrawal process)\n");

  const currentConsents = await consentReceipt.getUserConsents(participant.address);

  for (let i = 0; i < currentConsents.length; i++) {
    if (currentConsents[i].isValid) {
      await consentReceipt.connect(participant).revokeConsent(i);
      console.log(`    ✓ ${currentConsents[i].purpose}: WITHDRAWN`);
    }
  }

  // === ENROLLMENT REPORT ===

  console.log("\n" + "-".repeat(60));
  console.log("  Study Enrollment Report");
  console.log("-".repeat(60));

  const finalConsents = await consentReceipt.getUserConsents(participant.address);

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           STUDY ENROLLMENT RECORD                       │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log(`    │  Study ID: ${studyId}                              │`);
  console.log(`    │  Participant: ${participant.address.slice(0, 25)}...         │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  CONSENT HISTORY                                        │");

  for (const consent of finalConsents) {
    const status = consent.isValid ? "ACTIVE" : "WITHDRAWN";
    const timestamp = new Date(Number(consent.timestamp) * 1000).toLocaleString().slice(0, 10);
    console.log(`    │    ${consent.purpose.slice(0, 20)}: ${status} (${timestamp})`);
  }

  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  CURRENT STATUS                                         │");

  const activeCount = finalConsents.filter(c => c.isValid).length;
  console.log(`    │  • Active consents: ${activeCount}                                     │`);
  console.log(`    │  • Enrollment: ${activeCount > 0 ? "ACTIVE" : "WITHDRAWN"}                                │`);

  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  IRB COMPLIANCE                                         │");
  console.log("    │  ✓ Informed consent documented                         │");
  console.log("    │  ✓ Optional consents clearly separated                 │");
  console.log("    │  ✓ Withdrawal right respected                          │");
  console.log("    │  ✓ Complete consent history preserved                  │");
  console.log("    │  ✓ Timestamps for audit trail                          │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Informed consent with clear documentation");
  console.log("  • Required vs optional consent separation");
  console.log("  • Study duration-based consent expiration");
  console.log("  • Partial withdrawal supported");
  console.log("  • Full withdrawal preserves history");
  console.log("  • Complete audit trail for IRB review");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
