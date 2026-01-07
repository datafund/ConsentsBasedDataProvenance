/**
 * Example: Multi-Contract Workflow
 * Scenario: Integration Patterns
 * Persona: Backend Developers, System Architects
 *
 * This example demonstrates:
 * - Orchestrating operations across multiple contracts
 * - Maintaining workflow consistency
 * - State verification between steps
 * - Rollback-like patterns
 *
 * Scenario:
 * Complete data processing workflow:
 * 1. Verify user consent
 * 2. Register data with provenance
 * 3. Grant access to processor
 * 4. Log audit trail
 * 5. Transform data
 * 6. Verify all steps completed
 *
 * Run with:
 * npx hardhat run examples/09-integration-patterns/03-multi-contract-workflow.ts --network localhost
 */

import { ethers } from "hardhat";

// Workflow step status
interface WorkflowStep {
  name: string;
  status: "pending" | "success" | "failed" | "skipped";
  transactionHash?: string;
  error?: string;
  data?: any;
}

// Workflow orchestrator
class DataProcessingWorkflow {
  private steps: WorkflowStep[] = [];
  private contracts: {
    consent: any;
    provenance: any;
    accessControl: any;
    auditLog: any;
  };

  constructor(contracts: any) {
    this.contracts = contracts;
  }

  // Execute the complete workflow
  async execute(params: {
    user: any;
    processor: any;
    purpose: string;
    dataContent: string;
  }): Promise<{ success: boolean; steps: WorkflowStep[] }> {
    const { user, processor, purpose, dataContent } = params;

    console.log("\n    WORKFLOW EXECUTION:");
    console.log("    ═══════════════════════════════════════════════════════");

    // Step 1: Verify consent
    const consentStep = await this.verifyConsent(user.address, purpose);
    this.steps.push(consentStep);

    if (consentStep.status === "failed") {
      console.log("    ⚠ Workflow stopped: Consent verification failed");
      return { success: false, steps: this.steps };
    }

    // Step 2: Register data
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(dataContent));
    const registerStep = await this.registerData(user, dataHash, dataContent);
    this.steps.push(registerStep);

    if (registerStep.status === "failed") {
      // No rollback needed - consent wasn't modified
      console.log("    ⚠ Workflow stopped: Data registration failed");
      return { success: false, steps: this.steps };
    }

    // Step 3: Grant access to processor
    const accessStep = await this.grantAccess(user, dataHash, processor.address);
    this.steps.push(accessStep);

    if (accessStep.status === "failed") {
      // Mark data as restricted since access grant failed
      await this.restrictData(user, dataHash);
      console.log("    ⚠ Workflow stopped: Access grant failed, data restricted");
      return { success: false, steps: this.steps };
    }

    // Step 4: Log audit entry
    const auditStep = await this.logAudit(processor, user.address, dataHash, purpose);
    this.steps.push(auditStep);

    // Audit logging is not critical - continue even if it fails
    if (auditStep.status === "failed") {
      console.log("    ⚠ Warning: Audit logging failed, continuing workflow");
    }

    // Step 5: Transform data
    const transformStep = await this.transformData(processor, dataHash, "processed");
    this.steps.push(transformStep);

    // Step 6: Verify workflow completion
    const verifyStep = await this.verifyCompletion(dataHash, processor.address);
    this.steps.push(verifyStep);

    const success = this.steps.every(s => s.status === "success" || s.status === "skipped");

    console.log("\n    ═══════════════════════════════════════════════════════");

    return { success, steps: this.steps };
  }

  private async verifyConsent(userAddress: string, purpose: string): Promise<WorkflowStep> {
    console.log("\n    Step 1: Verify Consent");

    try {
      const hasConsent = await this.contracts.consent.getConsentStatus(userAddress, purpose);

      if (hasConsent) {
        console.log(`      ✓ User has valid consent for '${purpose}'`);
        return {
          name: "Verify Consent",
          status: "success",
          data: { hasConsent: true, purpose }
        };
      } else {
        console.log(`      ✗ User does not have consent for '${purpose}'`);
        return {
          name: "Verify Consent",
          status: "failed",
          error: "No valid consent found"
        };
      }
    } catch (error: any) {
      console.log(`      ✗ Error: ${error.message}`);
      return {
        name: "Verify Consent",
        status: "failed",
        error: error.message
      };
    }
  }

  private async registerData(owner: any, dataHash: string, description: string): Promise<WorkflowStep> {
    console.log("\n    Step 2: Register Data");

    try {
      const tx = await this.contracts.provenance.connect(owner).registerData(dataHash, description);
      const receipt = await tx.wait();

      console.log(`      ✓ Data registered: ${dataHash.slice(0, 20)}...`);
      return {
        name: "Register Data",
        status: "success",
        transactionHash: receipt.hash,
        data: { dataHash }
      };
    } catch (error: any) {
      console.log(`      ✗ Error: ${error.message}`);
      return {
        name: "Register Data",
        status: "failed",
        error: error.message
      };
    }
  }

  private async grantAccess(owner: any, dataHash: string, processorAddress: string): Promise<WorkflowStep> {
    console.log("\n    Step 3: Grant Access");

    try {
      const block = await this.contracts.accessControl.runner.provider.getBlock("latest");
      const expiry = block!.timestamp + (30 * 24 * 60 * 60); // 30 days

      const tx = await this.contracts.accessControl.connect(owner).grantAccess(
        dataHash,
        processorAddress,
        2, // Transform level
        expiry,
        ethers.ZeroHash
      );
      const receipt = await tx.wait();

      console.log(`      ✓ Access granted to: ${processorAddress.slice(0, 15)}...`);
      return {
        name: "Grant Access",
        status: "success",
        transactionHash: receipt.hash,
        data: { processor: processorAddress }
      };
    } catch (error: any) {
      console.log(`      ✗ Error: ${error.message}`);
      return {
        name: "Grant Access",
        status: "failed",
        error: error.message
      };
    }
  }

  private async logAudit(actor: any, subjectAddress: string, dataHash: string, purpose: string): Promise<WorkflowStep> {
    console.log("\n    Step 4: Log Audit");

    try {
      const subjectId = ethers.keccak256(ethers.toUtf8Bytes(subjectAddress));

      const tx = await this.contracts.auditLog.connect(actor).recordAudit(
        4, // DataAccessed
        subjectId,
        dataHash,
        JSON.stringify({ purpose, workflow: "data_processing" })
      );
      const receipt = await tx.wait();

      console.log(`      ✓ Audit entry logged`);
      return {
        name: "Log Audit",
        status: "success",
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.log(`      ✗ Warning: ${error.message}`);
      return {
        name: "Log Audit",
        status: "failed",
        error: error.message
      };
    }
  }

  private async transformData(processor: any, originalHash: string, transformation: string): Promise<WorkflowStep> {
    console.log("\n    Step 5: Transform Data");

    try {
      const newHash = ethers.keccak256(ethers.toUtf8Bytes(`${originalHash}_${transformation}`));

      const tx = await this.contracts.provenance.connect(processor).transformData(
        originalHash,
        newHash,
        transformation,
        "Workflow transformation"
      );
      const receipt = await tx.wait();

      console.log(`      ✓ Data transformed: ${newHash.slice(0, 20)}...`);
      return {
        name: "Transform Data",
        status: "success",
        transactionHash: receipt.hash,
        data: { newHash }
      };
    } catch (error: any) {
      console.log(`      ✗ Error: ${error.message}`);
      return {
        name: "Transform Data",
        status: "failed",
        error: error.message
      };
    }
  }

  private async verifyCompletion(dataHash: string, processorAddress: string): Promise<WorkflowStep> {
    console.log("\n    Step 6: Verify Completion");

    try {
      // Verify data is registered
      const dataRecord = await this.contracts.provenance.getDataRecord(dataHash);
      const dataExists = dataRecord.owner !== ethers.ZeroAddress;

      // Verify access was granted
      const hasAccess = await this.contracts.accessControl.isAccessValid(dataHash, processorAddress);

      if (dataExists && hasAccess) {
        console.log(`      ✓ Workflow verified: Data registered, access granted`);
        return {
          name: "Verify Completion",
          status: "success",
          data: { dataExists, hasAccess }
        };
      } else {
        console.log(`      ✗ Verification failed`);
        return {
          name: "Verify Completion",
          status: "failed",
          error: "State verification failed"
        };
      }
    } catch (error: any) {
      console.log(`      ✗ Error: ${error.message}`);
      return {
        name: "Verify Completion",
        status: "failed",
        error: error.message
      };
    }
  }

  private async restrictData(owner: any, dataHash: string): Promise<void> {
    try {
      await this.contracts.provenance.connect(owner).updateDataStatus(dataHash, 1); // Restricted
      console.log("      (Data marked as restricted for safety)");
    } catch {
      console.log("      (Failed to restrict data)");
    }
  }
}

// === MAIN EXAMPLE ===

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Integration: Multi-Contract Workflow");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up multi-contract workflow...\n");

  const [deployer, user, processor] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  User:      ${user.address.slice(0, 10)}... (Data owner)`);
  console.log(`  Processor: ${processor.address.slice(0, 10)}... (Data processor)`);

  // Deploy all contracts
  const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceiptFactory.deploy();
  await consentReceipt.waitForDeployment();

  const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
  const dataProvenance = await DataProvenanceFactory.deploy();
  await dataProvenance.waitForDeployment();

  const AccessControlFactory = await ethers.getContractFactory("DataAccessControl");
  const accessControl = await AccessControlFactory.deploy(await dataProvenance.getAddress());
  await accessControl.waitForDeployment();

  const AuditLogFactory = await ethers.getContractFactory("ConsentAuditLog");
  const auditLog = await AuditLogFactory.deploy();
  await auditLog.waitForDeployment();

  // Authorize processor for audit logging
  await auditLog.setAuthorizedRecorder(processor.address, true);

  console.log(`\nContracts deployed:`);
  console.log(`  ConsentReceipt: ${await consentReceipt.getAddress()}`);
  console.log(`  DataProvenance: ${await dataProvenance.getAddress()}`);
  console.log(`  AccessControl: ${await accessControl.getAddress()}`);
  console.log(`  AuditLog: ${await auditLog.getAddress()}`);

  // === SCENARIO 1: Workflow without consent (should fail) ===
  console.log("\n>>> Scenario 1: Workflow without consent (should fail)");

  const workflow1 = new DataProcessingWorkflow({
    consent: consentReceipt,
    provenance: dataProvenance,
    accessControl: accessControl,
    auditLog: auditLog
  });

  const result1 = await workflow1.execute({
    user,
    processor,
    purpose: "analytics",
    dataContent: "test_data_1"
  });

  console.log(`\n    Workflow result: ${result1.success ? "SUCCESS" : "FAILED"}`);
  console.log(`    Steps completed: ${result1.steps.filter(s => s.status === "success").length}/${result1.steps.length}`);

  // === SCENARIO 2: Workflow with consent (should succeed) ===
  console.log("\n>>> Scenario 2: Workflow with consent (should succeed)");

  // First, grant consent
  console.log("\n    Pre-requisite: Granting consent...");
  await consentReceipt.connect(user)["giveConsent(string)"]("analytics");
  console.log("    ✓ User granted consent for 'analytics'");

  const workflow2 = new DataProcessingWorkflow({
    consent: consentReceipt,
    provenance: dataProvenance,
    accessControl: accessControl,
    auditLog: auditLog
  });

  const result2 = await workflow2.execute({
    user,
    processor,
    purpose: "analytics",
    dataContent: "test_data_2"
  });

  console.log(`\n    Workflow result: ${result2.success ? "SUCCESS ✓" : "FAILED"}`);
  console.log(`    Steps completed: ${result2.steps.filter(s => s.status === "success").length}/${result2.steps.length}`);

  // === WORKFLOW SUMMARY ===
  console.log("\n>>> Workflow Step Summary");

  console.log("\n    Scenario 1 (No consent):");
  console.log("    ─────────────────────────────────────────────────────");
  for (const step of result1.steps) {
    const icon = step.status === "success" ? "✓" : step.status === "failed" ? "✗" : "○";
    console.log(`      ${icon} ${step.name}: ${step.status.toUpperCase()}`);
    if (step.error) console.log(`        Error: ${step.error}`);
  }

  console.log("\n    Scenario 2 (With consent):");
  console.log("    ─────────────────────────────────────────────────────");
  for (const step of result2.steps) {
    const icon = step.status === "success" ? "✓" : step.status === "failed" ? "✗" : "○";
    console.log(`      ${icon} ${step.name}: ${step.status.toUpperCase()}`);
    if (step.transactionHash) console.log(`        TX: ${step.transactionHash.slice(0, 20)}...`);
  }

  // === MULTI-CONTRACT WORKFLOW SUMMARY ===

  console.log("\n" + "-".repeat(60));
  console.log("  Multi-Contract Workflow Summary");
  console.log("-".repeat(60));

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           MULTI-CONTRACT WORKFLOW PATTERNS              │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  ORCHESTRATION                                          │");
  console.log("    │    • Sequential step execution                         │");
  console.log("    │    • State verification between steps                  │");
  console.log("    │    • Graceful failure handling                         │");
  console.log("    │    • Transaction tracking per step                     │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  CONSISTENCY PATTERNS                                   │");
  console.log("    │    • Pre-condition verification                        │");
  console.log("    │    • Post-condition verification                       │");
  console.log("    │    • Compensating actions on failure                   │");
  console.log("    │    • Non-critical step handling                        │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  CONTRACTS COORDINATED                                  │");
  console.log("    │    1. ConsentReceipt - Verify authorization            │");
  console.log("    │    2. DataProvenance - Register/transform data         │");
  console.log("    │    3. DataAccessControl - Grant processor access       │");
  console.log("    │    4. ConsentAuditLog - Record audit trail             │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  FAILURE HANDLING                                       │");
  console.log("    │    • Stop workflow on critical failures                │");
  console.log("    │    • Continue on non-critical failures (audit)         │");
  console.log("    │    • Compensating actions (restrict data)              │");
  console.log("    │    • Detailed error reporting per step                 │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Multi-Contract Patterns:");
  console.log("  • Workflow orchestration class");
  console.log("  • Sequential step execution");
  console.log("  • Pre-condition verification");
  console.log("  • Post-condition verification");
  console.log("  • Compensating actions");
  console.log("  • Detailed step tracking");
  console.log("\n  Production Considerations:");
  console.log("  • Use saga pattern for distributed workflows");
  console.log("  • Implement idempotency for retries");
  console.log("  • Consider event sourcing for audit");
  console.log("  • Add timeout handling");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
