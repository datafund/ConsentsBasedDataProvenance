/**
 * Example: Event-Driven Architecture
 * Scenario: Integration Patterns
 * Persona: Backend Developers, System Architects
 *
 * This example demonstrates:
 * - Listening to smart contract events
 * - Event filtering and parsing
 * - Real-time notification patterns
 * - Event-driven workflow triggers
 *
 * Scenario:
 * Building reactive applications:
 * 1. Set up event listeners for all contracts
 * 2. Filter events by criteria
 * 3. Process events for business logic
 * 4. Trigger downstream workflows
 *
 * Run with:
 * npx hardhat run examples/09-integration-patterns/01-event-driven.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Integration: Event-Driven Architecture");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up event-driven scenario...\n");

  const [deployer, user1, user2, controller] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  User 1:      ${user1.address.slice(0, 10)}...`);
  console.log(`  User 2:      ${user2.address.slice(0, 10)}...`);
  console.log(`  Controller:  ${controller.address.slice(0, 10)}...`);

  // Deploy contracts
  const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceiptFactory.deploy();
  await consentReceipt.waitForDeployment();

  const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
  const dataProvenance = await DataProvenanceFactory.deploy();
  await dataProvenance.waitForDeployment();

  const AuditLogFactory = await ethers.getContractFactory("ConsentAuditLog");
  const auditLog = await AuditLogFactory.deploy();
  await auditLog.waitForDeployment();

  console.log(`\nContracts deployed:`);
  console.log(`  ConsentReceipt: ${await consentReceipt.getAddress()}`);
  console.log(`  DataProvenance: ${await dataProvenance.getAddress()}`);
  console.log(`  AuditLog: ${await auditLog.getAddress()}`);

  // === EVENT LISTENER SETUP ===

  // Storage for captured events
  const capturedEvents: Array<{
    type: string;
    contract: string;
    data: Record<string, any>;
    block: number;
  }> = [];

  // Step 1: Set up event listeners
  console.log("\n>>> Step 1: Setting up event listeners");

  // ConsentReceipt events
  consentReceipt.on("ConsentGiven", (user, purpose, event) => {
    capturedEvents.push({
      type: "ConsentGiven",
      contract: "ConsentReceipt",
      data: { user, purpose },
      block: event.log.blockNumber
    });
    console.log(`    📥 Event: ConsentGiven - User: ${user.slice(0, 10)}...`);
  });

  consentReceipt.on("ConsentRevoked", (user, purpose, event) => {
    capturedEvents.push({
      type: "ConsentRevoked",
      contract: "ConsentReceipt",
      data: { user, purpose },
      block: event.log.blockNumber
    });
    console.log(`    📥 Event: ConsentRevoked - User: ${user.slice(0, 10)}...`);
  });

  // DataProvenance events
  dataProvenance.on("DataRegistered", (hash, owner, event) => {
    capturedEvents.push({
      type: "DataRegistered",
      contract: "DataProvenance",
      data: { hash, owner },
      block: event.log.blockNumber
    });
    console.log(`    📥 Event: DataRegistered - Hash: ${hash.slice(0, 15)}...`);
  });

  dataProvenance.on("DataTransformed", (originalHash, newHash, transformer, event) => {
    capturedEvents.push({
      type: "DataTransformed",
      contract: "DataProvenance",
      data: { originalHash, newHash, transformer },
      block: event.log.blockNumber
    });
    console.log(`    📥 Event: DataTransformed - New: ${newHash.slice(0, 15)}...`);
  });

  // AuditLog events
  auditLog.on("AuditRecorded", (index, action, actor, subjectId, relatedData, event) => {
    capturedEvents.push({
      type: "AuditRecorded",
      contract: "AuditLog",
      data: { index: Number(index), action: Number(action), actor, subjectId },
      block: event.log.blockNumber
    });
    console.log(`    📥 Event: AuditRecorded - Index: ${index}`);
  });

  console.log("    ✓ Event listeners registered for all contracts");

  // Step 2: Generate events through actions
  console.log("\n>>> Step 2: Generating events through actions");

  // Give consent
  console.log("\n    Action: User 1 gives consent for 'analytics'");
  await consentReceipt.connect(user1)["giveConsent(string)"]("analytics");

  // Wait a bit for event processing
  await new Promise(resolve => setTimeout(resolve, 100));

  // Register data
  console.log("    Action: Controller registers data");
  const dataHash = ethers.keccak256(ethers.toUtf8Bytes("sample_data"));
  await dataProvenance.connect(controller).registerData(dataHash, "sample_data");

  await new Promise(resolve => setTimeout(resolve, 100));

  // More consent
  console.log("    Action: User 2 gives consent for 'marketing'");
  await consentReceipt.connect(user2)["giveConsent(string)"]("marketing");

  await new Promise(resolve => setTimeout(resolve, 100));

  // Record audit
  console.log("    Action: Recording audit entry");
  await auditLog.recordAudit(
    4, // DataAccessed
    ethers.keccak256(ethers.toUtf8Bytes(user1.address)),
    dataHash,
    JSON.stringify({ action: "test_access" })
  );

  await new Promise(resolve => setTimeout(resolve, 100));

  // Transform data
  console.log("    Action: Transforming data");
  const newDataHash = ethers.keccak256(ethers.toUtf8Bytes("transformed_data"));
  await dataProvenance.connect(controller).transformData(
    dataHash,
    newDataHash,
    "anonymization",
    "Remove PII"
  );

  await new Promise(resolve => setTimeout(resolve, 100));

  // Revoke consent
  console.log("    Action: User 1 revokes consent");
  await consentReceipt.connect(user1).revokeConsent(0);

  // Wait for all events to be processed
  await new Promise(resolve => setTimeout(resolve, 500));

  // Step 3: Display captured events
  console.log("\n>>> Step 3: Display captured events");

  console.log(`\n    Total events captured: ${capturedEvents.length}`);
  console.log("\n    EVENT LOG:");
  console.log("    ═══════════════════════════════════════════════════════");

  for (let i = 0; i < capturedEvents.length; i++) {
    const event = capturedEvents[i];
    console.log(`\n    Event ${i + 1}:`);
    console.log(`      Type: ${event.type}`);
    console.log(`      Contract: ${event.contract}`);
    console.log(`      Block: ${event.block}`);
    console.log("      Data:");
    for (const [key, value] of Object.entries(event.data)) {
      const displayValue = typeof value === 'string' && value.length > 20
        ? value.slice(0, 20) + "..."
        : value;
      console.log(`        ${key}: ${displayValue}`);
    }
  }

  // Step 4: Event filtering patterns
  console.log("\n>>> Step 4: Event filtering patterns");

  // Filter by contract
  const consentEvents = capturedEvents.filter(e => e.contract === "ConsentReceipt");
  console.log(`\n    Consent-related events: ${consentEvents.length}`);

  // Filter by type
  const registrationEvents = capturedEvents.filter(e => e.type === "DataRegistered");
  console.log(`    Data registration events: ${registrationEvents.length}`);

  // Filter by user
  const user1Events = capturedEvents.filter(e =>
    e.data.user === user1.address || e.data.owner === user1.address
  );
  console.log(`    User 1 related events: ${user1Events.length}`);

  // Step 5: Demonstrate workflow triggers
  console.log("\n>>> Step 5: Workflow triggers based on events");

  console.log("\n    WORKFLOW TRIGGERS:");
  console.log("    ─────────────────────────────────────────────────────");

  for (const event of capturedEvents) {
    let workflow = "";

    switch (event.type) {
      case "ConsentGiven":
        workflow = "→ Trigger: Update CRM, Enable data processing, Send welcome email";
        break;
      case "ConsentRevoked":
        workflow = "→ Trigger: Stop marketing, Update preferences, Send confirmation";
        break;
      case "DataRegistered":
        workflow = "→ Trigger: Sync to data lake, Update inventory, Notify compliance";
        break;
      case "DataTransformed":
        workflow = "→ Trigger: Log transformation, Update lineage graph, Verify integrity";
        break;
      case "AuditRecorded":
        workflow = "→ Trigger: Check anomalies, Update dashboard, Archive to cold storage";
        break;
    }

    console.log(`\n    ${event.type}:`);
    console.log(`      ${workflow}`);
  }

  // Step 6: Historical event query
  console.log("\n>>> Step 6: Historical event query");

  // Query past ConsentGiven events
  const consentGivenFilter = consentReceipt.filters.ConsentGiven();
  const pastConsentEvents = await consentReceipt.queryFilter(consentGivenFilter);

  console.log(`\n    Historical ConsentGiven events: ${pastConsentEvents.length}`);
  for (const event of pastConsentEvents) {
    console.log(`      Block ${event.blockNumber}: ${(event as any).args[0].slice(0, 15)}...`);
  }

  // Query past DataRegistered events
  const dataRegisteredFilter = dataProvenance.filters.DataRegistered();
  const pastDataEvents = await dataProvenance.queryFilter(dataRegisteredFilter);

  console.log(`    Historical DataRegistered events: ${pastDataEvents.length}`);

  // Step 7: Clean up listeners
  console.log("\n>>> Step 7: Cleaning up listeners");

  consentReceipt.removeAllListeners();
  dataProvenance.removeAllListeners();
  auditLog.removeAllListeners();

  console.log("    ✓ All event listeners removed");

  // === EVENT-DRIVEN ARCHITECTURE SUMMARY ===

  console.log("\n" + "-".repeat(60));
  console.log("  Event-Driven Architecture Summary");
  console.log("-".repeat(60));

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           EVENT-DRIVEN PATTERNS                         │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  LISTENER TYPES                                         │");
  console.log("    │    • Real-time: contract.on(event, callback)           │");
  console.log("    │    • One-time: contract.once(event, callback)          │");
  console.log("    │    • Historical: contract.queryFilter(filter)          │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  EVENTS AVAILABLE                                       │");
  console.log("    │    ConsentReceipt:                                      │");
  console.log("    │      • ConsentGiven(user, purpose)                     │");
  console.log("    │      • ConsentRevoked(user, purpose)                   │");
  console.log("    │    DataProvenance:                                      │");
  console.log("    │      • DataRegistered(hash, owner)                     │");
  console.log("    │      • DataTransformed(original, new, transformer)     │");
  console.log("    │      • OwnershipTransferred(hash, from, to)            │");
  console.log("    │    AuditLog:                                            │");
  console.log("    │      • AuditRecorded(index, action, actor, subject)    │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  USE CASES                                              │");
  console.log("    │    • Real-time dashboards                              │");
  console.log("    │    • Webhook notifications                             │");
  console.log("    │    • Database synchronization                          │");
  console.log("    │    • Workflow automation                               │");
  console.log("    │    • Compliance monitoring                             │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Event-Driven Patterns Demonstrated:");
  console.log("  • Setting up multi-contract event listeners");
  console.log("  • Real-time event capture and logging");
  console.log("  • Event filtering by contract, type, and user");
  console.log("  • Workflow triggers based on events");
  console.log("  • Historical event queries");
  console.log("  • Proper listener cleanup");
  console.log("\n  Production Considerations:");
  console.log("  • Handle reconnection for long-running listeners");
  console.log("  • Implement event deduplication");
  console.log("  • Use message queues for reliability");
  console.log("  • Monitor listener health");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
