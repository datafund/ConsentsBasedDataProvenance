/**
 * Example: Manufacturing Chain
 * Scenario: IoT & Supply Chain
 * Persona: Supply Chain Managers, Quality Control, Developers
 *
 * This example demonstrates:
 * - Multi-stage product transformation
 * - Quality control records at each stage
 * - Chain of custody tracking
 * - Product recall traceability
 *
 * Scenario:
 * Product manufacturing lifecycle:
 * Raw Materials → Assembly → QC Testing → Packaging → Shipping
 * Each stage creates provenance record for full traceability.
 *
 * Run with:
 * npx hardhat run examples/06-iot-supply-chain/03-manufacturing-chain.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Supply Chain Example: Manufacturing Chain");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up manufacturing chain scenario...\n");

  const [deployer, rawMaterialSupplier, assemblyLine, qcDepartment, packaging, shipping] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Raw Material Supplier: ${rawMaterialSupplier.address.slice(0, 10)}...`);
  console.log(`  Assembly Line:         ${assemblyLine.address.slice(0, 10)}...`);
  console.log(`  QC Department:         ${qcDepartment.address.slice(0, 10)}...`);
  console.log(`  Packaging:             ${packaging.address.slice(0, 10)}...`);
  console.log(`  Shipping:              ${shipping.address.slice(0, 10)}...`);

  // Deploy DataProvenance
  const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
  const dataProvenance = await DataProvenanceFactory.deploy();
  await dataProvenance.waitForDeployment();

  console.log("\nDataProvenance deployed successfully.");

  // Product info
  const productId = "PROD-2024-00042";
  const productName = "Electronic Control Unit (ECU)";
  const batchId = "BATCH-2024-W15-001";

  const stages: { name: string; hash: string; owner: string }[] = [];

  // === SCENARIO ===

  // Stage 1: Raw Materials
  console.log("\n>>> Stage 1: RAW MATERIALS RECEIVED");

  const rawMaterialsData = {
    stage: "raw_materials",
    productId,
    batchId,
    materials: [
      { name: "PCB Board", lot: "PCB-2024-0891", quantity: 100 },
      { name: "Microcontroller", lot: "MCU-2024-4521", quantity: 100 },
      { name: "Capacitors", lot: "CAP-2024-7823", quantity: 1000 }
    ],
    supplier: "TechComponents Inc.",
    receivedDate: new Date().toISOString()
  };

  const rawMaterialsHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify(rawMaterialsData)
  ));

  await dataProvenance.connect(rawMaterialSupplier).registerData(
    rawMaterialsHash,
    "raw_materials"
  );

  stages.push({ name: "Raw Materials", hash: rawMaterialsHash, owner: "Supplier" });

  console.log(`    ✓ Raw materials registered`);
  console.log(`      Batch: ${batchId}`);
  console.log(`      Components: ${rawMaterialsData.materials.length} types`);
  console.log(`      Hash: ${rawMaterialsHash.slice(0, 20)}...`);

  // Stage 2: Assembly
  console.log("\n>>> Stage 2: ASSEMBLY");

  const assemblyData = {
    stage: "assembly",
    productId,
    batchId,
    assemblyLine: "Line A",
    operator: "OP-2024-115",
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    unitsProduced: 100
  };

  const assemblyHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify(assemblyData)
  ));

  await dataProvenance.connect(assemblyLine).transformData(
    rawMaterialsHash,
    assemblyHash,
    "assembly: raw_materials → assembled_units, Line A, 100 units"
  );

  stages.push({ name: "Assembly", hash: assemblyHash, owner: "Assembly Line" });

  console.log(`    ✓ Assembly completed`);
  console.log(`      Line: ${assemblyData.assemblyLine}`);
  console.log(`      Units: ${assemblyData.unitsProduced}`);
  console.log(`      Hash: ${assemblyHash.slice(0, 20)}...`);

  // Stage 3: Quality Control
  console.log("\n>>> Stage 3: QUALITY CONTROL");

  const qcData = {
    stage: "quality_control",
    productId,
    batchId,
    tests: [
      { name: "Visual Inspection", result: "PASS", inspector: "QC-042" },
      { name: "Functional Test", result: "PASS", inspector: "QC-043" },
      { name: "Electrical Safety", result: "PASS", inspector: "QC-044" }
    ],
    passedUnits: 98,
    failedUnits: 2,
    qcDate: new Date().toISOString()
  };

  const qcHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify(qcData)
  ));

  await dataProvenance.connect(qcDepartment).transformData(
    assemblyHash,
    qcHash,
    `quality_control: 3 tests, ${qcData.passedUnits}/${qcData.passedUnits + qcData.failedUnits} passed`
  );

  stages.push({ name: "Quality Control", hash: qcHash, owner: "QC Department" });

  console.log(`    ✓ QC completed`);
  console.log(`      Tests: ${qcData.tests.length} performed`);
  console.log(`      Pass rate: ${((qcData.passedUnits / (qcData.passedUnits + qcData.failedUnits)) * 100).toFixed(0)}%`);
  console.log(`      Hash: ${qcHash.slice(0, 20)}...`);

  // Stage 4: Packaging
  console.log("\n>>> Stage 4: PACKAGING");

  const packagingData = {
    stage: "packaging",
    productId,
    batchId,
    packaging: {
      type: "Anti-static box",
      unitsPerBox: 10,
      totalBoxes: 10
    },
    labels: ["Product ID", "Batch ID", "QR Code", "ESD Warning"],
    packagingDate: new Date().toISOString()
  };

  const packagingHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify(packagingData)
  ));

  await dataProvenance.connect(packaging).transformData(
    qcHash,
    packagingHash,
    "packaging: anti-static boxes, 10 units/box, labeled"
  );

  stages.push({ name: "Packaging", hash: packagingHash, owner: "Packaging" });

  console.log(`    ✓ Packaging completed`);
  console.log(`      Boxes: ${packagingData.packaging.totalBoxes}`);
  console.log(`      Units/box: ${packagingData.packaging.unitsPerBox}`);
  console.log(`      Hash: ${packagingHash.slice(0, 20)}...`);

  // Stage 5: Shipping
  console.log("\n>>> Stage 5: SHIPPING");

  const shippingData = {
    stage: "shipping",
    productId,
    batchId,
    shipment: {
      carrier: "FastFreight Logistics",
      trackingNumber: "FF-2024-8847291",
      destination: "Customer Warehouse, Detroit",
      estimatedDelivery: new Date(Date.now() + 86400000 * 3).toISOString()
    },
    shippingDate: new Date().toISOString()
  };

  const shippingHash = ethers.keccak256(ethers.toUtf8Bytes(
    JSON.stringify(shippingData)
  ));

  await dataProvenance.connect(shipping).transformData(
    packagingHash,
    shippingHash,
    `shipping: ${shippingData.shipment.carrier}, tracking=${shippingData.shipment.trackingNumber}`
  );

  stages.push({ name: "Shipping", hash: shippingHash, owner: "Shipping" });

  console.log(`    ✓ Shipped`);
  console.log(`      Carrier: ${shippingData.shipment.carrier}`);
  console.log(`      Tracking: ${shippingData.shipment.trackingNumber}`);
  console.log(`      Hash: ${shippingHash.slice(0, 20)}...`);

  // === VIEW SUPPLY CHAIN ===

  console.log("\n" + "-".repeat(60));
  console.log("  Complete Supply Chain Provenance");
  console.log("-".repeat(60));

  console.log("\n    Product Lifecycle:");
  console.log("    ═══════════════════════════════════════════════════════════");

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const record = await dataProvenance.getDataRecord(stage.hash);

    console.log(`\n    ┌─── ${stage.name.toUpperCase()} ───`);
    console.log(`    │  Hash: ${stage.hash.slice(0, 30)}...`);
    console.log(`    │  Owner: ${stage.owner}`);
    console.log(`    │  Type: ${record.dataType}`);

    if (record.transformations.length > 0) {
      console.log(`    │  Transform: ${record.transformations[0].slice(0, 45)}...`);
    }

    if (i < stages.length - 1) {
      console.log("    │");
      console.log("    └────────────────────────────────────────────────────────");
      console.log("                              ↓");
    } else {
      console.log("    │");
      console.log("    └────────────────────────────────────────────────────────");
    }
  }

  // === TRACEABILITY REPORT ===

  console.log("\n" + "-".repeat(60));
  console.log("  Product Traceability Report");
  console.log("-".repeat(60));

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │        PRODUCT TRACEABILITY REPORT                      │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log(`    │  Product: ${productName}                       │`);
  console.log(`    │  Product ID: ${productId}                           │`);
  console.log(`    │  Batch ID: ${batchId}                         │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  SUPPLY CHAIN STAGES                                    │");
  console.log(`    │    1. Raw Materials: ✓ Received from supplier          │`);
  console.log(`    │    2. Assembly: ✓ 100 units produced                   │`);
  console.log(`    │    3. Quality Control: ✓ 98/100 passed                 │`);
  console.log(`    │    4. Packaging: ✓ 10 boxes prepared                   │`);
  console.log(`    │    5. Shipping: ✓ In transit                           │`);
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  CHAIN OF CUSTODY                                       │");
  console.log("    │    Supplier → Assembly → QC → Packaging → Shipping     │");
  console.log("    │    All transfers recorded on-chain                     │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  RECALL CAPABILITY                                      │");
  console.log("    │  ✓ Full traceability to raw material lots              │");
  console.log("    │  ✓ All affected units identifiable by batch            │");
  console.log("    │  ✓ Customer shipment trackable                         │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Each manufacturing stage creates provenance record");
  console.log("  • Transformations link stages together");
  console.log("  • Chain of custody clearly documented");
  console.log("  • QC results tracked with pass/fail counts");
  console.log("  • Full traceability for recall scenarios");
  console.log("  • Shipping details linked to product history");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
