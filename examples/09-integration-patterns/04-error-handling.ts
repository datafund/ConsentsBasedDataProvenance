/**
 * Example: Error Handling
 * Scenario: Integration Patterns
 * Persona: Backend Developers, DevOps Engineers
 *
 * This example demonstrates:
 * - Common smart contract error types
 * - Retry strategies with exponential backoff
 * - Graceful degradation patterns
 * - User-friendly error mapping
 *
 * Scenario:
 * Production error handling:
 * 1. Identify common error types
 * 2. Implement retry with backoff
 * 3. Handle network issues gracefully
 * 4. Map errors to user-friendly messages
 *
 * Run with:
 * npx hardhat run examples/09-integration-patterns/04-error-handling.ts --network localhost
 */

import { ethers } from "hardhat";

// === ERROR TYPES ===

enum ErrorType {
  USER_REJECTION = "USER_REJECTION",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  CONTRACT_REVERT = "CONTRACT_REVERT",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
  UNKNOWN = "UNKNOWN"
}

interface ParsedError {
  type: ErrorType;
  message: string;
  userMessage: string;
  retryable: boolean;
  details?: any;
}

// === ERROR PARSER ===

function parseContractError(error: any): ParsedError {
  const errorString = error.message || error.toString();

  // User rejected transaction
  if (errorString.includes("user rejected") || errorString.includes("User denied")) {
    return {
      type: ErrorType.USER_REJECTION,
      message: errorString,
      userMessage: "Transaction was cancelled. Please try again if this was unintentional.",
      retryable: true
    };
  }

  // Insufficient funds
  if (errorString.includes("insufficient funds") || errorString.includes("doesn't have enough funds")) {
    return {
      type: ErrorType.INSUFFICIENT_FUNDS,
      message: errorString,
      userMessage: "Your wallet doesn't have enough funds for this transaction.",
      retryable: false
    };
  }

  // Contract revert with reason
  if (errorString.includes("reverted") || errorString.includes("revert")) {
    // Extract revert reason
    const reasonMatch = errorString.match(/reason="([^"]+)"/);
    const reason = reasonMatch ? reasonMatch[1] : "Unknown reason";

    return {
      type: ErrorType.CONTRACT_REVERT,
      message: reason,
      userMessage: mapRevertReason(reason),
      retryable: false,
      details: { reason }
    };
  }

  // Network errors
  if (errorString.includes("network") || errorString.includes("connection") ||
    errorString.includes("ECONNREFUSED") || errorString.includes("timeout")) {
    return {
      type: ErrorType.NETWORK_ERROR,
      message: errorString,
      userMessage: "Network error. Please check your connection and try again.",
      retryable: true
    };
  }

  // Unknown error
  return {
    type: ErrorType.UNKNOWN,
    message: errorString,
    userMessage: "An unexpected error occurred. Please try again later.",
    retryable: true
  };
}

// Map contract revert reasons to user-friendly messages
function mapRevertReason(reason: string): string {
  const reasonMap: Record<string, string> = {
    "Invalid consent": "The consent record is not valid or has been revoked.",
    "Not authorized": "You don't have permission to perform this action.",
    "Data not found": "The requested data record does not exist.",
    "Already exists": "This record already exists in the system.",
    "Expired": "The consent or access has expired.",
    "Invalid purpose": "The specified purpose is not valid.",
    "Access denied": "You don't have access to this data.",
    "Not owner": "Only the data owner can perform this action.",
    "Max limit exceeded": "The maximum limit has been reached."
  };

  for (const [key, message] of Object.entries(reasonMap)) {
    if (reason.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }

  return `Operation failed: ${reason}`;
}

// === RETRY STRATEGY ===

interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
  }
): Promise<{ success: boolean; result?: T; attempts: number; lastError?: ParsedError }> {
  let lastError: ParsedError | undefined;
  let delay = options.initialDelayMs;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      const result = await operation();
      return { success: true, result, attempts: attempt };
    } catch (error) {
      lastError = parseContractError(error);

      console.log(`      Attempt ${attempt}/${options.maxAttempts} failed: ${lastError.type}`);

      // Don't retry non-retryable errors
      if (!lastError.retryable) {
        console.log(`      Error is not retryable, stopping`);
        break;
      }

      // Don't wait after the last attempt
      if (attempt < options.maxAttempts) {
        console.log(`      Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * options.backoffMultiplier, options.maxDelayMs);
      }
    }
  }

  return { success: false, attempts: options.maxAttempts, lastError };
}

// === GRACEFUL DEGRADATION ===

interface OperationResult<T> {
  success: boolean;
  data?: T;
  source: "blockchain" | "cache" | "fallback";
  error?: ParsedError;
}

class GracefulConsentChecker {
  private contract: any;
  private cache: Map<string, { value: boolean; timestamp: number }>;
  private cacheTTL: number;

  constructor(contract: any, cacheTTLMs: number = 60000) {
    this.contract = contract;
    this.cache = new Map();
    this.cacheTTL = cacheTTLMs;
  }

  async checkConsent(userAddress: string, purpose: string): Promise<OperationResult<boolean>> {
    const cacheKey = `${userAddress}-${purpose}`;

    // Try blockchain first
    try {
      const result = await this.contract.getConsentStatus(userAddress, purpose);

      // Update cache
      this.cache.set(cacheKey, { value: result, timestamp: Date.now() });

      return {
        success: true,
        data: result,
        source: "blockchain"
      };
    } catch (error) {
      const parsedError = parseContractError(error);

      // Fall back to cache
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTTL * 5) {
        // Use stale cache (5x TTL) as fallback
        return {
          success: true,
          data: cached.value,
          source: "cache",
          error: parsedError
        };
      }

      // Final fallback: deny access (fail-safe)
      return {
        success: false,
        data: false, // Conservative default
        source: "fallback",
        error: parsedError
      };
    }
  }
}

// === MAIN EXAMPLE ===

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Integration: Error Handling Patterns");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up error handling scenario...\n");

  const [deployer, user] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  User:  ${user.address.slice(0, 10)}...`);

  // Deploy ConsentReceipt
  const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceiptFactory.deploy();
  await consentReceipt.waitForDeployment();

  console.log(`\nConsentReceipt deployed at: ${await consentReceipt.getAddress()}`);

  // === SCENARIO 1: Error Type Identification ===
  console.log("\n>>> Scenario 1: Error Type Identification");

  // Simulate various errors
  const errorScenarios = [
    {
      name: "Invalid consent revocation",
      operation: async () => {
        await consentReceipt.connect(user).revokeConsent(999); // Non-existent
      }
    },
    {
      name: "Successful operation",
      operation: async () => {
        await consentReceipt.connect(user)["giveConsent(string)"]("test_purpose");
      }
    }
  ];

  console.log("\n    ERROR TYPE IDENTIFICATION:");
  console.log("    ─────────────────────────────────────────────────────");

  for (const scenario of errorScenarios) {
    console.log(`\n    Testing: ${scenario.name}`);

    try {
      await scenario.operation();
      console.log("      Result: SUCCESS");
    } catch (error) {
      const parsed = parseContractError(error);
      console.log(`      Error Type: ${parsed.type}`);
      console.log(`      Retryable: ${parsed.retryable}`);
      console.log(`      User Message: ${parsed.userMessage}`);
    }
  }

  // === SCENARIO 2: Retry with Exponential Backoff ===
  console.log("\n>>> Scenario 2: Retry with Exponential Backoff");

  // Successful operation with retry wrapper
  console.log("\n    Testing successful operation with retry:");
  const successResult = await withRetry(
    async () => {
      await consentReceipt.connect(user)["giveConsent(string)"]("retry_test");
      return true;
    },
    { maxAttempts: 3, initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2 }
  );

  console.log(`\n    Result: ${successResult.success ? "SUCCESS" : "FAILED"}`);
  console.log(`    Attempts: ${successResult.attempts}`);

  // Operation that will fail (invalid revocation)
  console.log("\n    Testing failing operation with retry:");
  const failResult = await withRetry(
    async () => {
      await consentReceipt.connect(user).revokeConsent(999);
      return true;
    },
    { maxAttempts: 3, initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2 }
  );

  console.log(`\n    Result: ${failResult.success ? "SUCCESS" : "FAILED"}`);
  console.log(`    Attempts: ${failResult.attempts}`);
  if (failResult.lastError) {
    console.log(`    Error: ${failResult.lastError.userMessage}`);
  }

  // === SCENARIO 3: Graceful Degradation ===
  console.log("\n>>> Scenario 3: Graceful Degradation");

  const gracefulChecker = new GracefulConsentChecker(consentReceipt, 5000);

  // First call - from blockchain
  console.log("\n    Call 1 - Fresh query:");
  const check1 = await gracefulChecker.checkConsent(user.address, "test_purpose");
  console.log(`      Success: ${check1.success}`);
  console.log(`      Source: ${check1.source}`);
  console.log(`      Has Consent: ${check1.data}`);

  // Second call - potentially from cache
  console.log("\n    Call 2 - Repeat query:");
  const check2 = await gracefulChecker.checkConsent(user.address, "test_purpose");
  console.log(`      Success: ${check2.success}`);
  console.log(`      Source: ${check2.source}`);
  console.log(`      Has Consent: ${check2.data}`);

  // === SCENARIO 4: Error Response Mapping ===
  console.log("\n>>> Scenario 4: Error Response Mapping");

  const mockErrors = [
    { reason: "Invalid consent", context: "revoke" },
    { reason: "Not authorized", context: "grant access" },
    { reason: "Data not found", context: "query" },
    { reason: "Expired", context: "check consent" },
    { reason: "Max limit exceeded", context: "register" }
  ];

  console.log("\n    ERROR TO USER MESSAGE MAPPING:");
  console.log("    ─────────────────────────────────────────────────────");

  for (const mock of mockErrors) {
    const userMessage = mapRevertReason(mock.reason);
    console.log(`\n    Contract reason: "${mock.reason}"`);
    console.log(`    User message: "${userMessage}"`);
  }

  // === SCENARIO 5: Complete Error Handling Flow ===
  console.log("\n>>> Scenario 5: Complete Error Handling Flow");

  async function safeConsentOperation(
    operation: () => Promise<any>,
    operationName: string
  ): Promise<{
    success: boolean;
    message: string;
    transactionHash?: string;
  }> {
    console.log(`\n    Executing: ${operationName}`);

    const result = await withRetry(
      async () => {
        const tx = await operation();
        const receipt = await tx.wait();
        return receipt.hash;
      },
      { maxAttempts: 2, initialDelayMs: 500, maxDelayMs: 2000, backoffMultiplier: 2 }
    );

    if (result.success) {
      return {
        success: true,
        message: `${operationName} completed successfully`,
        transactionHash: result.result
      };
    } else {
      return {
        success: false,
        message: result.lastError?.userMessage || "Operation failed"
      };
    }
  }

  // Test the complete flow
  const grantResult = await safeConsentOperation(
    () => consentReceipt.connect(user)["giveConsent(string)"]("complete_flow_test"),
    "Grant Consent"
  );

  console.log(`\n    Result:`);
  console.log(`      Success: ${grantResult.success}`);
  console.log(`      Message: ${grantResult.message}`);
  if (grantResult.transactionHash) {
    console.log(`      TX: ${grantResult.transactionHash.slice(0, 25)}...`);
  }

  // === ERROR HANDLING SUMMARY ===

  console.log("\n" + "-".repeat(60));
  console.log("  Error Handling Summary");
  console.log("-".repeat(60));

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           ERROR HANDLING PATTERNS                       │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  ERROR TYPES                                            │");
  console.log("    │    • USER_REJECTION: User cancelled transaction        │");
  console.log("    │    • INSUFFICIENT_FUNDS: Not enough ETH                │");
  console.log("    │    • CONTRACT_REVERT: Smart contract error             │");
  console.log("    │    • NETWORK_ERROR: Connection issues                  │");
  console.log("    │    • TIMEOUT: Operation took too long                  │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  RETRY STRATEGY                                         │");
  console.log("    │    • Exponential backoff (1s → 2s → 4s → ...)         │");
  console.log("    │    • Maximum retry attempts                            │");
  console.log("    │    • Skip retry for non-retryable errors               │");
  console.log("    │    • Configurable delays and multipliers               │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  GRACEFUL DEGRADATION                                   │");
  console.log("    │    • Try blockchain first                              │");
  console.log("    │    • Fall back to cache on failure                     │");
  console.log("    │    • Use stale cache with extended TTL                 │");
  console.log("    │    • Conservative fallback (deny access)               │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  USER EXPERIENCE                                        │");
  console.log("    │    • Map technical errors to friendly messages         │");
  console.log("    │    • Indicate if retry is possible                     │");
  console.log("    │    • Provide actionable guidance                       │");
  console.log("    │    • Include transaction details on success            │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Error Handling Patterns:");
  console.log("  • Error type identification");
  console.log("  • User-friendly message mapping");
  console.log("  • Retry with exponential backoff");
  console.log("  • Graceful degradation with fallbacks");
  console.log("  • Complete error handling flow");
  console.log("\n  Production Additions:");
  console.log("  • Error monitoring and alerting");
  console.log("  • Circuit breaker pattern");
  console.log("  • Structured logging");
  console.log("  • Error analytics dashboard");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
