/**
 * Shared Utility Functions
 *
 * Helper functions for logging, data hashing, and formatting
 * used across all example scenarios.
 */

import { ethers } from "hardhat";

// ============================================================
// Console Logging Utilities
// ============================================================

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m"
};

/**
 * Log a step in the example workflow
 */
export function logStep(message: string, stepNumber?: number) {
  const prefix = stepNumber ? `Step ${stepNumber}:` : ">>>";
  console.log(`\n${COLORS.cyan}${COLORS.bright}${prefix}${COLORS.reset} ${message}`);
}

/**
 * Log a successful result
 */
export function logSuccess(message: string) {
  console.log(`${COLORS.green}✓${COLORS.reset} ${message}`);
}

/**
 * Log an informational message
 */
export function logInfo(message: string) {
  console.log(`${COLORS.blue}ℹ${COLORS.reset} ${message}`);
}

/**
 * Log a warning
 */
export function logWarning(message: string) {
  console.log(`${COLORS.yellow}⚠${COLORS.reset} ${message}`);
}

/**
 * Log an error
 */
export function logError(message: string) {
  console.log(`${COLORS.red}✗${COLORS.reset} ${message}`);
}

/**
 * Log section header
 */
export function logHeader(title: string) {
  const line = "=".repeat(60);
  console.log(`\n${COLORS.magenta}${line}${COLORS.reset}`);
  console.log(`${COLORS.magenta}${COLORS.bright}  ${title}${COLORS.reset}`);
  console.log(`${COLORS.magenta}${line}${COLORS.reset}\n`);
}

/**
 * Log a data object in a formatted way
 */
export function logData(label: string, data: Record<string, unknown>) {
  console.log(`\n${COLORS.dim}--- ${label} ---${COLORS.reset}`);
  for (const [key, value] of Object.entries(data)) {
    const formattedValue = typeof value === "bigint" ? value.toString() : value;
    console.log(`  ${key}: ${formattedValue}`);
  }
}

/**
 * Log transaction result
 */
export function logTransaction(label: string, txHash: string) {
  console.log(`${COLORS.green}✓${COLORS.reset} ${label}`);
  console.log(`  ${COLORS.dim}tx: ${txHash}${COLORS.reset}`);
}

/**
 * Log example completion
 */
export function logComplete(message: string = "Example completed successfully!") {
  console.log(`\n${COLORS.green}${COLORS.bright}========================================${COLORS.reset}`);
  console.log(`${COLORS.green}${COLORS.bright}  ${message}${COLORS.reset}`);
  console.log(`${COLORS.green}${COLORS.bright}========================================${COLORS.reset}\n`);
}

// ============================================================
// Data Hashing Utilities
// ============================================================

/**
 * Create a deterministic hash from string data
 */
export function hashData(data: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(data));
}

/**
 * Create a hash from structured data (e.g., JSON object)
 */
export function hashObject(obj: Record<string, unknown>): string {
  return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(obj)));
}

/**
 * Create a unique data hash with timestamp
 */
export function hashWithTimestamp(data: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(`${data}-${Date.now()}`));
}

/**
 * Create a simulated patient record hash
 */
export function createPatientRecordHash(patientId: string, recordType: string, date: string): string {
  return hashObject({
    patientId,
    recordType,
    date,
    timestamp: Date.now()
  });
}

/**
 * Create a simulated transaction hash
 */
export function createTransactionHash(txId: string, amount: number, date: string): string {
  return hashObject({
    transactionId: txId,
    amount,
    date,
    timestamp: Date.now()
  });
}

// ============================================================
// Time Utilities
// ============================================================

/**
 * Get current blockchain timestamp
 */
export async function getBlockTimestamp(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block!.timestamp;
}

/**
 * Calculate expiry timestamp from current block
 */
export async function calculateExpiry(durationInSeconds: number): Promise<number> {
  const currentTime = await getBlockTimestamp();
  return currentTime + durationInSeconds;
}

/**
 * Advance blockchain time (for testing scenarios)
 */
export async function advanceTime(seconds: number): Promise<void> {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

/**
 * Format timestamp to readable date
 */
export function formatTimestamp(timestamp: number | bigint): string {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  return new Date(ts * 1000).toISOString();
}

// ============================================================
// Address Utilities
// ============================================================

/**
 * Format address for display (shortened)
 */
export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format address with label
 */
export function labeledAddress(label: string, address: string): string {
  return `${label} (${shortAddress(address)})`;
}

// ============================================================
// Event Parsing Utilities
// ============================================================

/**
 * Extract event args from transaction receipt
 */
export async function getEventArgs(
  tx: Awaited<ReturnType<typeof ethers.ContractTransactionResponse.prototype.wait>>,
  eventName: string
): Promise<Record<string, unknown> | undefined> {
  if (!tx || !tx.logs) return undefined;

  for (const log of tx.logs) {
    // Type guard - check if it's an EventLog with args
    if ("eventName" in log && log.eventName === eventName && "args" in log) {
      return log.args as unknown as Record<string, unknown>;
    }
  }
  return undefined;
}

// ============================================================
// Consent Status Display
// ============================================================

/**
 * Display consent status in a formatted way
 */
export function displayConsentStatus(
  user: string,
  purpose: string,
  hasConsent: boolean,
  expiryTime?: number | bigint
) {
  const status = hasConsent ? `${COLORS.green}ACTIVE${COLORS.reset}` : `${COLORS.red}INACTIVE${COLORS.reset}`;
  console.log(`\n  Consent Status for ${shortAddress(user)}:`);
  console.log(`    Purpose: ${purpose}`);
  console.log(`    Status: ${status}`);
  if (expiryTime && expiryTime > 0) {
    console.log(`    Expires: ${formatTimestamp(expiryTime)}`);
  }
}

/**
 * Display data record in a formatted way
 */
export function displayDataRecord(record: {
  dataHash: string;
  owner: string;
  timestamp: bigint;
  dataType: string;
  status: number;
}) {
  const statusMap = ["ACTIVE", "RESTRICTED", "DELETED"];
  console.log(`\n  Data Record:`);
  console.log(`    Hash: ${record.dataHash.slice(0, 18)}...`);
  console.log(`    Owner: ${shortAddress(record.owner)}`);
  console.log(`    Type: ${record.dataType}`);
  console.log(`    Status: ${statusMap[record.status]}`);
  console.log(`    Registered: ${formatTimestamp(record.timestamp)}`);
}

// ============================================================
// Scenario Setup Helpers
// ============================================================

/**
 * Create a scenario description banner
 */
export function scenarioBanner(scenario: {
  title: string;
  industry: string;
  description: string;
  actors: string[];
}) {
  console.log(`\n${COLORS.bright}${"─".repeat(60)}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}Scenario: ${scenario.title}${COLORS.reset}`);
  console.log(`${COLORS.dim}Industry: ${scenario.industry}${COLORS.reset}`);
  console.log(`${COLORS.bright}${"─".repeat(60)}${COLORS.reset}`);
  console.log(`\n${scenario.description}\n`);
  console.log(`${COLORS.dim}Actors involved:${COLORS.reset}`);
  scenario.actors.forEach(actor => console.log(`  • ${actor}`));
  console.log();
}
