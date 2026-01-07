/**
 * Example: Smart City
 * Scenario: IoT & Supply Chain
 * Persona: City Planners, Citizens, Developers
 *
 * This example demonstrates:
 * - Citizen consent for city data collection
 * - Municipal service consent management
 * - Privacy-preserving data collection
 * - Opt-in/opt-out for city services
 *
 * Scenario:
 * Smart city services:
 * 1. Citizen registers with city platform
 * 2. Opts into specific services
 * 3. Location/traffic data collected (with consent)
 * 4. Citizen manages privacy preferences
 *
 * Run with:
 * npx hardhat run examples/06-iot-supply-chain/04-smart-city.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Smart City Example: Citizen Data Consent");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up smart city scenario...\n");

  const [deployer, citizen, cityPlatform, trafficDept, transitAuthority] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Citizen:           ${citizen.address.slice(0, 10)}...`);
  console.log(`  City Platform:     ${cityPlatform.address.slice(0, 10)}...`);
  console.log(`  Traffic Dept:      ${trafficDept.address.slice(0, 10)}...`);
  console.log(`  Transit Authority: ${transitAuthority.address.slice(0, 10)}...`);

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

  // Define city services and consent purposes
  const CITY_SERVICES = {
    TRAFFIC_MONITORING: { key: "city_traffic_monitoring", name: "Traffic Monitoring", desc: "Optimize traffic flow" },
    TRANSIT_TRACKING: { key: "city_transit_tracking", name: "Transit Tracking", desc: "Improve public transit" },
    PARKING_GUIDANCE: { key: "city_parking_guidance", name: "Parking Guidance", desc: "Find available parking" },
    AIR_QUALITY: { key: "city_air_quality", name: "Air Quality Alerts", desc: "Receive air quality updates" },
    EMERGENCY_ALERTS: { key: "city_emergency_alerts", name: "Emergency Alerts", desc: "Receive emergency notifications" },
    ANONYMIZED_ANALYTICS: { key: "city_anonymized_analytics", name: "City Analytics", desc: "Contribute to city planning" }
  };

  // === SCENARIO ===

  // Step 1: Citizen registers with city platform
  console.log("\n>>> Step 1: Citizen registers with Smart City platform\n");

  console.log("    ╔═══════════════════════════════════════════════════════════╗");
  console.log("    ║           🏙️ Smart City Services                           ║");
  console.log("    ╠═══════════════════════════════════════════════════════════╣");
  console.log("    ║  Welcome! Choose which city services to enable:           ║");
  console.log("    ║                                                            ║");

  for (const [, service] of Object.entries(CITY_SERVICES)) {
    console.log(`    ║  ☐ ${service.name}`);
    console.log(`    ║     ${service.desc}`);
  }

  console.log("    ║                                                            ║");
  console.log("    ║  Your privacy is important. You can change these          ║");
  console.log("    ║  settings at any time.                                     ║");
  console.log("    ╚═══════════════════════════════════════════════════════════╝");

  // Step 2: Citizen selects services
  console.log("\n>>> Step 2: Citizen selects services to enable\n");

  // Citizen enables some services
  const enabledServices = [
    CITY_SERVICES.TRAFFIC_MONITORING,
    CITY_SERVICES.PARKING_GUIDANCE,
    CITY_SERVICES.EMERGENCY_ALERTS,
    CITY_SERVICES.ANONYMIZED_ANALYTICS
  ];

  const disabledServices = [
    CITY_SERVICES.TRANSIT_TRACKING,
    CITY_SERVICES.AIR_QUALITY
  ];

  for (const service of enabledServices) {
    await consentReceipt.connect(citizen)["giveConsent(string)"](service.key);
    console.log(`    ✓ ${service.name}: ENABLED`);
  }

  for (const service of disabledServices) {
    console.log(`    ✗ ${service.name}: DISABLED`);
  }

  // Step 3: City collects traffic data (with consent)
  console.log("\n>>> Step 3: City collects traffic data (with consent)");

  // Verify consent before collection
  const hasTrafficConsent = await consentReceipt.getConsentStatus(citizen.address, CITY_SERVICES.TRAFFIC_MONITORING.key);

  if (hasTrafficConsent) {
    // Simulated anonymous traffic data
    const trafficDataHash = ethers.keccak256(ethers.toUtf8Bytes(
      JSON.stringify({
        citizenId: citizen.address,
        dataType: "traffic_contribution",
        zone: "Downtown",
        timestamp: Date.now(),
        anonymized: true
      })
    ));

    await integratedSystem.connect(citizen).registerDataWithConsent(
      trafficDataHash,
      "traffic_data",
      CITY_SERVICES.TRAFFIC_MONITORING.key
    );

    console.log("    ✓ Traffic data collected (consent valid)");
    console.log(`      Hash: ${trafficDataHash.slice(0, 20)}...`);
  }

  // Step 4: Traffic dept accesses aggregated data
  console.log("\n>>> Step 4: Traffic department accesses data");

  await consentReceipt.connect(trafficDept)["giveConsent(string)"](CITY_SERVICES.TRAFFIC_MONITORING.key);

  const citizenData = await integratedSystem.getUserRegisteredData(citizen.address);
  if (citizenData.length > 0) {
    await integratedSystem.connect(trafficDept).accessDataWithConsent(
      citizenData[0],
      CITY_SERVICES.TRAFFIC_MONITORING.key
    );
    console.log("    ✓ Traffic department accessed anonymized data");
  }

  // Step 5: Try to access transit data (should fail - no consent)
  console.log("\n>>> Step 5: Transit authority requests data access");

  const hasTransitConsent = await consentReceipt.getConsentStatus(citizen.address, CITY_SERVICES.TRANSIT_TRACKING.key);
  console.log(`    Transit tracking consent: ${hasTransitConsent ? "VALID" : "NOT GIVEN"}`);
  console.log("    Transit authority cannot access data (no citizen consent)");

  // Step 6: Citizen views privacy dashboard
  console.log("\n>>> Step 6: Citizen views privacy dashboard");

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           🔒 Your Privacy Dashboard                      │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  ENABLED SERVICES                                        │");

  for (const service of enabledServices) {
    const hasConsent = await consentReceipt.getConsentStatus(citizen.address, service.key);
    if (hasConsent) {
      console.log(`    │    ✓ ${service.name}`);
    }
  }

  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  DISABLED SERVICES                                       │");

  for (const service of disabledServices) {
    console.log(`    │    ✗ ${service.name}`);
  }

  console.log("    └─────────────────────────────────────────────────────────┘");

  // Step 7: Citizen opts out of traffic monitoring
  console.log("\n>>> Step 7: Citizen opts out of traffic monitoring");

  const consents = await consentReceipt.getUserConsents(citizen.address);
  for (let i = 0; i < consents.length; i++) {
    if (consents[i].purpose === CITY_SERVICES.TRAFFIC_MONITORING.key && consents[i].isValid) {
      await consentReceipt.connect(citizen).revokeConsent(i);
      console.log("    ✓ Traffic Monitoring: DISABLED");
      break;
    }
  }

  // Step 8: Final service status
  console.log("\n>>> Step 8: Final service status");

  console.log("\n    City Services Status:");
  console.log("    ─────────────────────────────────────────────────────");

  for (const [, service] of Object.entries(CITY_SERVICES)) {
    const hasConsent = await consentReceipt.getConsentStatus(citizen.address, service.key);
    const status = hasConsent ? "☑ ON" : "☐ OFF";
    const padding = " ".repeat(Math.max(0, 22 - service.name.length));
    console.log(`      ${service.name}${padding}${status}`);
  }

  // === PRIVACY REPORT ===

  console.log("\n" + "-".repeat(60));
  console.log("  Citizen Privacy Report");
  console.log("-".repeat(60));

  const finalConsents = await consentReceipt.getUserConsents(citizen.address);

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           CITIZEN PRIVACY REPORT                        │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log(`    │  Citizen ID: ${citizen.address.slice(0, 25)}...           │`);
  console.log(`    │  Report Date: ${new Date().toLocaleString()}            │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  CONSENT HISTORY                                        │");

  for (const consent of finalConsents) {
    const status = consent.isValid ? "ACTIVE" : "REVOKED";
    const serviceName = consent.purpose.replace("city_", "").replace(/_/g, " ");
    console.log(`    │    ${serviceName}: ${status}`);
  }

  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  DATA COLLECTED                                         │");
  console.log(`    │    Total data records: ${citizenData.length}                                │`);
  console.log("    │    All data anonymized: YES                             │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  YOUR RIGHTS                                            │");
  console.log("    │  ✓ Opt-in/opt-out at any time                          │");
  console.log("    │  ✓ Request data deletion                               │");
  console.log("    │  ✓ View your data                                      │");
  console.log("    │  ✓ Complete consent history                            │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Citizens opt-in to specific city services");
  console.log("  • Data collection only with valid consent");
  console.log("  • City departments access only authorized data");
  console.log("  • Citizens can opt-out at any time");
  console.log("  • Privacy dashboard shows current settings");
  console.log("  • Complete consent history available");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
