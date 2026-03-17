/**
 * Example: Sensor Provenance
 * Scenario: IoT & Supply Chain
 * Persona: Developers, Industrial Operators
 *
 * This example demonstrates:
 * - Time-series sensor data tracking
 * - Data aggregation provenance
 * - Transformation chain for processed data
 * - Sensor calibration records
 *
 * Scenario:
 * Industrial sensor monitoring:
 * 1. Raw sensor readings collected
 * 2. Data calibrated and validated
 * 3. Aggregated into time windows
 * 4. Complete lineage maintained
 *
 * Run with:
 * npx hardhat run examples/06-iot-supply-chain/02-sensor-provenance.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  IoT Example: Sensor Provenance");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up sensor provenance scenario...\n");

  const [deployer, sensorOperator, dataProcessor, qualityControl] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Sensor Operator:   ${sensorOperator.address.slice(0, 10)}...`);
  console.log(`  Data Processor:    ${dataProcessor.address.slice(0, 10)}...`);
  console.log(`  Quality Control:   ${qualityControl.address.slice(0, 10)}...`);

  // Deploy contracts
  const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
  const dataProvenance = await DataProvenanceFactory.deploy();
  await dataProvenance.waitForDeployment();

  console.log("\nDataProvenance deployed successfully.");

  // Sensor info
  const sensorId = "TEMP-SENSOR-042";
  const sensorType = "Industrial Temperature Sensor";

  // === SCENARIO ===

  // Step 1: Collect raw sensor readings
  console.log("\n>>> Step 1: Collect raw sensor readings");
  console.log(`    Sensor: ${sensorType} (${sensorId})\n`);

  const rawReadings = [
    { value: 75.2, unit: "C", timestamp: Date.now() },
    { value: 75.5, unit: "C", timestamp: Date.now() + 1000 },
    { value: 74.8, unit: "C", timestamp: Date.now() + 2000 },
    { value: 75.1, unit: "C", timestamp: Date.now() + 3000 },
    { value: 75.3, unit: "C", timestamp: Date.now() + 4000 }
  ];

  const rawDataHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify({
      sensorId,
      readings: rawReadings,
      collectionPeriod: "5 seconds",
      raw: true
    })
  ));

  await dataProvenance.connect(sensorOperator).registerData(
    rawDataHash,
    "raw_sensor_readings"
  );

  console.log(`    ✓ Collected ${rawReadings.length} raw readings`);
  console.log(`      Hash: ${rawDataHash.slice(0, 20)}...`);
  console.log(`      Range: ${Math.min(...rawReadings.map(r => r.value))}°C - ${Math.max(...rawReadings.map(r => r.value))}°C`);

  // Step 2: Apply calibration
  console.log("\n>>> Step 2: Apply sensor calibration");

  // Calibration offset based on calibration certificate
  const calibrationOffset = -0.3;

  const calibratedReadings = rawReadings.map(r => ({
    ...r,
    calibratedValue: +(r.value + calibrationOffset).toFixed(1)
  }));

  const calibratedDataHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify({
      sensorId,
      readings: calibratedReadings,
      calibrationOffset,
      calibrationDate: "2024-01-15",
      calibrationCertificate: "CAL-2024-0042"
    })
  ));

  await dataProvenance.connect(dataProcessor).transformData(
    rawDataHash,
    calibratedDataHash,
    `calibration_applied: offset=${calibrationOffset}°C, cert=CAL-2024-0042`
  );

  console.log(`    ✓ Calibration applied`);
  console.log(`      Offset: ${calibrationOffset}°C`);
  console.log(`      Certificate: CAL-2024-0042`);
  console.log(`      Hash: ${calibratedDataHash.slice(0, 20)}...`);

  // Step 3: Validate data quality
  console.log("\n>>> Step 3: Validate data quality");

  // Check for outliers, sensor health
  const validatedReadings = calibratedReadings.filter(r => {
    // Simple validation: within expected range
    return r.calibratedValue >= 50 && r.calibratedValue <= 100;
  });

  const validatedDataHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify({
      sensorId,
      readings: validatedReadings,
      validationRules: ["range_check", "rate_of_change"],
      outliers_removed: calibratedReadings.length - validatedReadings.length
    })
  ));

  await dataProvenance.connect(qualityControl).transformData(
    calibratedDataHash,
    validatedDataHash,
    "quality_validation: range_check, rate_of_change"
  );

  console.log(`    ✓ Quality validation complete`);
  console.log(`      Rules applied: range_check, rate_of_change`);
  console.log(`      Valid readings: ${validatedReadings.length}/${calibratedReadings.length}`);
  console.log(`      Hash: ${validatedDataHash.slice(0, 20)}...`);

  // Step 4: Aggregate into time window
  console.log("\n>>> Step 4: Aggregate into time window");

  const values = validatedReadings.map(r => r.calibratedValue);
  const aggregatedData = {
    sensorId,
    windowStart: rawReadings[0].timestamp,
    windowEnd: rawReadings[rawReadings.length - 1].timestamp,
    aggregation: {
      mean: +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    }
  };

  const aggregatedDataHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify(aggregatedData)
  ));

  await dataProvenance.connect(dataProcessor).transformData(
    validatedDataHash,
    aggregatedDataHash,
    "time_window_aggregation: 5s window, mean/min/max"
  );

  console.log(`    ✓ Data aggregated`);
  console.log(`      Mean: ${aggregatedData.aggregation.mean}°C`);
  console.log(`      Min: ${aggregatedData.aggregation.min}°C`);
  console.log(`      Max: ${aggregatedData.aggregation.max}°C`);
  console.log(`      Hash: ${aggregatedDataHash.slice(0, 20)}...`);

  // Step 5: View complete data lineage
  console.log("\n>>> Step 5: View complete data lineage");

  const dataChain = [
    { hash: rawDataHash, name: "Raw Sensor Readings", type: "raw_sensor_readings" },
    { hash: calibratedDataHash, name: "Calibrated Readings", type: "calibrated" },
    { hash: validatedDataHash, name: "Validated Readings", type: "validated" },
    { hash: aggregatedDataHash, name: "Aggregated Data", type: "aggregated" }
  ];

  console.log("\n    Data Lineage Chain:");
  console.log("    ═══════════════════════════════════════════════════════════");

  for (let i = 0; i < dataChain.length; i++) {
    const item = dataChain[i];
    const record = await dataProvenance.getDataRecord(item.hash);
    const statusMap = ["ACTIVE", "RESTRICTED", "DELETED"];

    console.log(`\n    ┌─── ${item.name} ───`);
    console.log(`    │  Hash: ${item.hash.slice(0, 30)}...`);
    console.log(`    │  Type: ${record.dataType}`);
    console.log(`    │  Owner: ${record.owner.slice(0, 10)}...`);
    console.log(`    │  Status: ${statusMap[record.status]}`);

    if (record.transformationLinks.length > 0) {
      console.log(`    │  Transform: ${record.transformationLinks[0].description}`);
    }

    if (i < dataChain.length - 1) {
      console.log("    │");
      console.log("    └────────────────────────────────────────────────────────");
      console.log("                              ↓");
    } else {
      console.log("    │");
      console.log("    └────────────────────────────────────────────────────────");
    }
  }

  // === PROVENANCE REPORT ===

  console.log("\n" + "-".repeat(60));
  console.log("  Sensor Data Provenance Report");
  console.log("-".repeat(60));

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │        SENSOR DATA PROVENANCE REPORT                    │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log(`    │  Sensor: ${sensorId}                              │`);
  console.log(`    │  Type: ${sensorType}                  │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  TRANSFORMATION CHAIN                                   │");
  console.log("    │    1. Raw readings collected                            │");
  console.log("    │       ↓ [calibration_applied]                           │");
  console.log("    │    2. Calibrated with certificate CAL-2024-0042         │");
  console.log("    │       ↓ [quality_validation]                            │");
  console.log("    │    3. Quality validated (range/rate checks)             │");
  console.log("    │       ↓ [time_window_aggregation]                       │");
  console.log("    │    4. Aggregated to 5s window statistics                │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  DATA QUALITY                                           │");
  console.log(`    │    Raw readings: ${rawReadings.length}                                       │`);
  console.log(`    │    Valid readings: ${validatedReadings.length}                                     │`);
  console.log(`    │    Quality rate: ${((validatedReadings.length / rawReadings.length) * 100).toFixed(0)}%                                     │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  COMPLIANCE                                             │");
  console.log("    │  ✓ Complete lineage from raw to processed              │");
  console.log("    │  ✓ Calibration certificate documented                  │");
  console.log("    │  ✓ Quality validation recorded                         │");
  console.log("    │  ✓ Each transformation traceable                       │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Raw sensor data registered with provenance");
  console.log("  • Calibration transformation documented");
  console.log("  • Quality validation recorded");
  console.log("  • Aggregation tracked as transformation");
  console.log("  • Complete lineage from raw to processed");
  console.log("  • Supports industrial compliance requirements");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
