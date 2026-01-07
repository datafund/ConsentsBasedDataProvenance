/**
 * Example: Device Registration
 * Scenario: IoT & Supply Chain
 * Persona: Developers, IoT Platform Operators
 *
 * This example demonstrates:
 * - Device-to-user consent linkage
 * - IoT data collection consent
 * - Device data registration
 * - Data access tracking
 *
 * Scenario:
 * Smart home device setup:
 * 1. User purchases and registers device
 * 2. User consents to data collection
 * 3. Device sends data to platform
 * 4. Platform accesses data with valid consent
 *
 * Run with:
 * npx hardhat run examples/06-iot-supply-chain/01-device-registration.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  IoT Example: Device Registration");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up IoT device registration scenario...\n");

  const [deployer, deviceOwner, iotPlatform, analytics] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Device Owner:   ${deviceOwner.address.slice(0, 10)}...`);
  console.log(`  IoT Platform:   ${iotPlatform.address.slice(0, 10)}...`);
  console.log(`  Analytics:      ${analytics.address.slice(0, 10)}...`);

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

  // Device info
  const deviceId = "SMART-THERM-001";
  const deviceType = "Smart Thermostat";

  // Define consent purposes
  const DATA_COLLECTION = "iot_data_collection";
  const ANALYTICS = "iot_analytics";
  const REMOTE_CONTROL = "iot_remote_control";

  // === SCENARIO ===

  // Step 1: Device registration
  console.log("\n>>> Step 1: Register smart device");
  console.log(`    Device: ${deviceType} (${deviceId})\n`);

  // Create device registration hash
  const deviceRegistrationHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify({
      deviceId,
      deviceType,
      owner: deviceOwner.address,
      registeredAt: Date.now(),
      firmware: "v2.1.0"
    })
  ));

  // Owner gives consent for basic data collection
  await consentReceipt.connect(deviceOwner)["giveConsent(string)"](DATA_COLLECTION);
  console.log("    ✓ Data collection consent given");

  // Register device data
  await integratedSystem.connect(deviceOwner).registerDataWithConsent(
    deviceRegistrationHash,
    "device_registration",
    DATA_COLLECTION
  );

  console.log(`    ✓ Device registered`);
  console.log(`      Hash: ${deviceRegistrationHash.slice(0, 20)}...`);

  // Step 2: User configures privacy settings
  console.log("\n>>> Step 2: Configure privacy settings");

  console.log("\n    Privacy Settings:");
  console.log("    ─────────────────────────────────────────────────────");

  // User enables analytics
  await consentReceipt.connect(deviceOwner)["giveConsent(string)"](ANALYTICS);
  console.log("      ☑ Analytics sharing: ENABLED");

  // User enables remote control
  await consentReceipt.connect(deviceOwner)["giveConsent(string)"](REMOTE_CONTROL);
  console.log("      ☑ Remote control: ENABLED");

  // Step 3: Device sends telemetry data
  console.log("\n>>> Step 3: Device sends telemetry data");

  const telemetryReadings = [
    { temp: 72, humidity: 45, mode: "cooling", ts: Date.now() },
    { temp: 71, humidity: 46, mode: "cooling", ts: Date.now() + 60000 },
    { temp: 70, humidity: 47, mode: "idle", ts: Date.now() + 120000 }
  ];

  const telemetryHashes: string[] = [];

  for (let i = 0; i < telemetryReadings.length; i++) {
    const reading = telemetryReadings[i];
    const hash = ethers.keccak256(ethers.toUtf8Bytes(
      JSON.stringify({
        deviceId,
        reading,
        sequence: i
      })
    ));
    telemetryHashes.push(hash);

    await integratedSystem.connect(deviceOwner).registerDataWithConsent(
      hash,
      "telemetry_data",
      DATA_COLLECTION
    );

    console.log(`    ✓ Telemetry ${i + 1}: temp=${reading.temp}°F, humidity=${reading.humidity}%`);
  }

  // Step 4: Platform accesses data
  console.log("\n>>> Step 4: IoT Platform accesses device data");

  // Platform needs consent
  await consentReceipt.connect(iotPlatform)["giveConsent(string)"](DATA_COLLECTION);

  for (const hash of telemetryHashes) {
    await integratedSystem.connect(iotPlatform).accessDataWithConsent(
      hash,
      DATA_COLLECTION
    );
  }

  console.log(`    ✓ Platform accessed ${telemetryHashes.length} telemetry records`);

  // Step 5: Analytics service accesses data
  console.log("\n>>> Step 5: Analytics service requests data access");

  // Check if owner gave analytics consent
  const hasAnalyticsConsent = await consentReceipt.getConsentStatus(deviceOwner.address, ANALYTICS);

  if (hasAnalyticsConsent) {
    await consentReceipt.connect(analytics)["giveConsent(string)"](ANALYTICS);

    await integratedSystem.connect(analytics).accessDataWithConsent(
      telemetryHashes[0],
      ANALYTICS
    );
    console.log("    ✓ Analytics service accessed data (consent valid)");
  } else {
    console.log("    ✗ Analytics access denied (no consent)");
  }

  // Step 6: View device data provenance
  console.log("\n>>> Step 6: View device data provenance");

  const ownerData = await integratedSystem.getUserRegisteredData(deviceOwner.address);

  console.log(`\n    Device Owner's Data Records: ${ownerData.length}`);
  console.log("    ─────────────────────────────────────────────────────");

  for (let i = 0; i < ownerData.length; i++) {
    const record = await dataProvenance.getDataRecord(ownerData[i]);
    console.log(`\n    [${i + 1}] ${record.dataType}`);
    console.log(`        Hash: ${ownerData[i].slice(0, 20)}...`);
    console.log(`        Accessors: ${record.accessors.length}`);
  }

  // Step 7: User disables analytics
  console.log("\n>>> Step 7: User disables analytics sharing");

  const consents = await consentReceipt.getUserConsents(deviceOwner.address);
  for (let i = 0; i < consents.length; i++) {
    if (consents[i].purpose === ANALYTICS && consents[i].isValid) {
      await consentReceipt.connect(deviceOwner).revokeConsent(i);
      console.log("    ✓ Analytics sharing: DISABLED");
      break;
    }
  }

  // Verify analytics can't access new data
  const canAccessAnalytics = await consentReceipt.getConsentStatus(deviceOwner.address, ANALYTICS);
  console.log(`    Analytics consent now: ${canAccessAnalytics ? "ACTIVE" : "REVOKED"}`);

  // === DEVICE REPORT ===

  console.log("\n" + "-".repeat(60));
  console.log("  IoT Device Report");
  console.log("-".repeat(60));

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           IOT DEVICE DATA REPORT                        │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log(`    │  Device: ${deviceType} (${deviceId})                  │`);
  console.log(`    │  Owner: ${deviceOwner.address.slice(0, 25)}...            │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  CONSENT STATUS                                         │");

  const dataConsent = await consentReceipt.getConsentStatus(deviceOwner.address, DATA_COLLECTION);
  const analyticsConsentFinal = await consentReceipt.getConsentStatus(deviceOwner.address, ANALYTICS);
  const remoteConsent = await consentReceipt.getConsentStatus(deviceOwner.address, REMOTE_CONTROL);

  console.log(`    │    Data Collection: ${dataConsent ? "ACTIVE" : "DISABLED"}                           │`);
  console.log(`    │    Analytics: ${analyticsConsentFinal ? "ACTIVE" : "DISABLED"}                                  │`);
  console.log(`    │    Remote Control: ${remoteConsent ? "ACTIVE" : "DISABLED"}                            │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  DATA SUMMARY                                           │");
  console.log(`    │    Total records: ${ownerData.length}                                      │`);
  console.log(`    │    Telemetry readings: ${telemetryHashes.length}                                 │`);
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Device registration linked to owner consent");
  console.log("  • Granular consent per data usage type");
  console.log("  • Telemetry data tracked with provenance");
  console.log("  • Third-party access requires valid consent");
  console.log("  • Users can revoke consent at any time");
  console.log("  • Complete audit trail for data access");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
