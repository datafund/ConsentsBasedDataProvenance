/**
 * Example: Backend Service Integration
 * Scenario: Integration Patterns
 * Persona: Backend Developers, API Engineers
 *
 * This example demonstrates:
 * - Provider and signer management
 * - Consent service abstraction
 * - Caching strategies
 * - API-style patterns for consent operations
 *
 * Scenario:
 * Building a consent management service:
 * 1. Create reusable consent service class
 * 2. Implement caching for consent checks
 * 3. Handle transactions with proper patterns
 * 4. Provide API-ready response formats
 *
 * Run with:
 * npx hardhat run examples/09-integration-patterns/02-backend-service.ts --network localhost
 */

import { ethers } from "hardhat";

// === CONSENT SERVICE CLASS ===
// This demonstrates a production-ready service abstraction

interface ConsentStatus {
  isValid: boolean;
  purpose: string;
  grantedAt?: Date;
  expiresAt?: Date;
  cached: boolean;
}

interface ConsentGrant {
  success: boolean;
  receiptId?: string;
  transactionHash?: string;
  error?: string;
}

interface ServiceStats {
  cacheHits: number;
  cacheMisses: number;
  transactions: number;
  errors: number;
}

class ConsentService {
  private contract: any;
  private cache: Map<string, { status: ConsentStatus; expires: number }>;
  private cacheTTL: number;
  private stats: ServiceStats;

  constructor(contract: any, cacheTTLMs: number = 60000) {
    this.contract = contract;
    this.cache = new Map();
    this.cacheTTL = cacheTTLMs;
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      transactions: 0,
      errors: 0
    };
  }

  // Check consent with caching
  async checkConsent(userAddress: string, purpose: string): Promise<ConsentStatus> {
    const cacheKey = `${userAddress}-${purpose}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      this.stats.cacheHits++;
      return { ...cached.status, cached: true };
    }

    this.stats.cacheMisses++;

    try {
      // Call contract
      const isValid = await this.contract.getConsentStatus(userAddress, purpose);

      const status: ConsentStatus = {
        isValid,
        purpose,
        cached: false
      };

      // Update cache
      this.cache.set(cacheKey, {
        status,
        expires: Date.now() + this.cacheTTL
      });

      return status;
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  // Grant consent with transaction handling
  async grantConsent(
    signer: any,
    purpose: string,
    expirySeconds?: number
  ): Promise<ConsentGrant> {
    try {
      this.stats.transactions++;

      let tx;
      if (expirySeconds) {
        const block = await this.contract.runner.provider.getBlock("latest");
        const expiry = block!.timestamp + expirySeconds;
        tx = await this.contract.connect(signer)["giveConsent(string,uint256)"](purpose, expiry);
      } else {
        tx = await this.contract.connect(signer)["giveConsent(string)"](purpose);
      }

      const receipt = await tx.wait();

      // Invalidate cache for this user
      this.invalidateUserCache(signer.address);

      // Get consent index from contract
      const count = await this.contract.getUserConsentsCount(signer.address);

      return {
        success: true,
        receiptId: `${signer.address}-${Number(count) - 1}`,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      this.stats.errors++;
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  // Revoke consent
  async revokeConsent(signer: any, consentIndex: number): Promise<ConsentGrant> {
    try {
      this.stats.transactions++;

      const tx = await this.contract.connect(signer).revokeConsent(consentIndex);
      const receipt = await tx.wait();

      // Invalidate cache
      this.invalidateUserCache(signer.address);

      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      this.stats.errors++;
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  // Get all consents for a user
  async getUserConsents(userAddress: string): Promise<any[]> {
    const count = await this.contract.getUserConsentsCount(userAddress);
    const consents = [];

    for (let i = 0; i < Number(count); i++) {
      const consent = await this.contract.getUserConsentByIndex(userAddress, i);
      consents.push({
        index: i,
        purpose: consent.purpose,
        timestamp: new Date(Number(consent.timestamp) * 1000),
        expiryTime: consent.expiryTime > 0 ? new Date(Number(consent.expiryTime) * 1000) : null,
        isRevoked: consent.isRevoked
      });
    }

    return consents;
  }

  // Invalidate cache for a user
  private invalidateUserCache(userAddress: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(userAddress)) {
        this.cache.delete(key);
      }
    }
  }

  // Parse contract errors
  private parseError(error: any): string {
    if (error.message?.includes("user rejected")) {
      return "Transaction rejected by user";
    }
    if (error.message?.includes("insufficient funds")) {
      return "Insufficient funds for transaction";
    }
    if (error.message?.includes("Invalid consent")) {
      return "Invalid consent reference";
    }
    return error.message || "Unknown error";
  }

  // Get service statistics
  getStats(): ServiceStats {
    return { ...this.stats };
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }
}

// === MAIN EXAMPLE ===

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Integration: Backend Service Pattern");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up backend service scenario...\n");

  const [deployer, user1, user2] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  User 1:  ${user1.address.slice(0, 10)}...`);
  console.log(`  User 2:  ${user2.address.slice(0, 10)}...`);

  // Deploy ConsentReceipt
  const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceiptFactory.deploy();
  await consentReceipt.waitForDeployment();

  console.log(`\nConsentReceipt deployed at: ${await consentReceipt.getAddress()}`);

  // Create consent service instance
  const consentService = new ConsentService(consentReceipt, 5000); // 5 second cache TTL

  console.log("    ✓ ConsentService initialized with 5s cache TTL");

  // === SCENARIO ===

  // Step 1: Grant consents through service
  console.log("\n>>> Step 1: Grant consents through service");

  const grant1 = await consentService.grantConsent(user1, "analytics");
  console.log(`\n    User 1 grants 'analytics' consent:`);
  console.log(`      Success: ${grant1.success}`);
  console.log(`      Receipt: ${grant1.receiptId}`);
  console.log(`      TX Hash: ${grant1.transactionHash?.slice(0, 20)}...`);

  const oneYear = 365 * 24 * 60 * 60;
  const grant2 = await consentService.grantConsent(user1, "marketing", oneYear);
  console.log(`\n    User 1 grants 'marketing' consent (1 year):`);
  console.log(`      Success: ${grant2.success}`);
  console.log(`      Receipt: ${grant2.receiptId}`);

  const grant3 = await consentService.grantConsent(user2, "analytics");
  console.log(`\n    User 2 grants 'analytics' consent:`);
  console.log(`      Success: ${grant3.success}`);
  console.log(`      Receipt: ${grant3.receiptId}`);

  // Step 2: Check consents with caching
  console.log("\n>>> Step 2: Check consents with caching");

  // First check - cache miss
  const check1 = await consentService.checkConsent(user1.address, "analytics");
  console.log(`\n    Check 1 - User 1 'analytics':`);
  console.log(`      Valid: ${check1.isValid}`);
  console.log(`      Cached: ${check1.cached}`);

  // Second check - cache hit
  const check2 = await consentService.checkConsent(user1.address, "analytics");
  console.log(`\n    Check 2 - User 1 'analytics' (repeat):`);
  console.log(`      Valid: ${check2.isValid}`);
  console.log(`      Cached: ${check2.cached}`);

  // Different purpose - cache miss
  const check3 = await consentService.checkConsent(user1.address, "marketing");
  console.log(`\n    Check 3 - User 1 'marketing':`);
  console.log(`      Valid: ${check3.isValid}`);
  console.log(`      Cached: ${check3.cached}`);

  // Non-existent consent
  const check4 = await consentService.checkConsent(user2.address, "marketing");
  console.log(`\n    Check 4 - User 2 'marketing' (not granted):`);
  console.log(`      Valid: ${check4.isValid}`);
  console.log(`      Cached: ${check4.cached}`);

  // Step 3: Get user consents
  console.log("\n>>> Step 3: Get all user consents");

  const user1Consents = await consentService.getUserConsents(user1.address);

  console.log(`\n    User 1 consents (${user1Consents.length}):`);
  for (const consent of user1Consents) {
    console.log(`\n      Index ${consent.index}:`);
    console.log(`        Purpose: ${consent.purpose}`);
    console.log(`        Granted: ${consent.timestamp.toISOString()}`);
    console.log(`        Expires: ${consent.expiryTime?.toISOString() || "Never"}`);
    console.log(`        Revoked: ${consent.isRevoked}`);
  }

  // Step 4: Revoke consent
  console.log("\n>>> Step 4: Revoke consent through service");

  const revoke = await consentService.revokeConsent(user1, 0);
  console.log(`\n    User 1 revokes consent index 0:`);
  console.log(`      Success: ${revoke.success}`);
  console.log(`      TX Hash: ${revoke.transactionHash?.slice(0, 20)}...`);

  // Verify revocation - should be cache miss due to invalidation
  const checkAfterRevoke = await consentService.checkConsent(user1.address, "analytics");
  console.log(`\n    Check after revocation:`);
  console.log(`      Valid: ${checkAfterRevoke.isValid}`);
  console.log(`      Cached: ${checkAfterRevoke.cached} (cache invalidated)`);

  // Step 5: Service statistics
  console.log("\n>>> Step 5: Service statistics");

  const stats = consentService.getStats();
  console.log(`\n    SERVICE STATISTICS:`);
  console.log("    ─────────────────────────────────────────────────────");
  console.log(`      Cache Hits: ${stats.cacheHits}`);
  console.log(`      Cache Misses: ${stats.cacheMisses}`);
  console.log(`      Transactions: ${stats.transactions}`);
  console.log(`      Errors: ${stats.errors}`);
  console.log(`      Hit Rate: ${((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100).toFixed(1)}%`);

  // Step 6: API response patterns
  console.log("\n>>> Step 6: API response patterns");

  // Simulated API responses
  const apiResponses = {
    checkConsent: {
      endpoint: "GET /api/consent/:userId/:purpose",
      response: {
        status: 200,
        data: {
          userId: user1.address,
          purpose: "marketing",
          hasConsent: true,
          grantedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + oneYear * 1000).toISOString()
        }
      }
    },
    grantConsent: {
      endpoint: "POST /api/consent",
      requestBody: {
        purpose: "analytics",
        expiryDays: 365
      },
      response: {
        status: 201,
        data: {
          success: true,
          receiptId: grant1.receiptId,
          transactionHash: grant1.transactionHash
        }
      }
    },
    listConsents: {
      endpoint: "GET /api/consent/:userId",
      response: {
        status: 200,
        data: {
          userId: user1.address,
          consents: user1Consents.map(c => ({
            purpose: c.purpose,
            isActive: !c.isRevoked,
            grantedAt: c.timestamp.toISOString()
          })),
          total: user1Consents.length
        }
      }
    },
    revokeConsent: {
      endpoint: "DELETE /api/consent/:userId/:index",
      response: {
        status: 200,
        data: {
          success: true,
          transactionHash: revoke.transactionHash
        }
      }
    }
  };

  console.log("\n    API RESPONSE PATTERNS:");
  console.log("    ═══════════════════════════════════════════════════════");

  for (const [name, pattern] of Object.entries(apiResponses)) {
    console.log(`\n    ${name}:`);
    console.log(`      Endpoint: ${pattern.endpoint}`);
    if ('requestBody' in pattern) {
      console.log(`      Request: ${JSON.stringify(pattern.requestBody)}`);
    }
    console.log(`      Status: ${pattern.response.status}`);
    console.log(`      Response: ${JSON.stringify(pattern.response.data, null, 2).split('\n').map((l, i) => i === 0 ? l : '                ' + l).join('\n')}`);
  }

  // === BACKEND SERVICE SUMMARY ===

  console.log("\n" + "-".repeat(60));
  console.log("  Backend Service Summary");
  console.log("-".repeat(60));

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           BACKEND SERVICE PATTERNS                      │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  SERVICE ABSTRACTION                                    │");
  console.log("    │    • Encapsulate contract interactions                 │");
  console.log("    │    • Handle transaction lifecycle                      │");
  console.log("    │    • Provide clean API interface                       │");
  console.log("    │    • Centralize error handling                         │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  CACHING STRATEGY                                       │");
  console.log("    │    • TTL-based cache expiration                        │");
  console.log("    │    • Cache invalidation on writes                      │");
  console.log("    │    • User-scoped cache keys                            │");
  console.log("    │    • Cache statistics for monitoring                   │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │  API DESIGN                                             │");
  console.log("    │    • RESTful endpoints                                 │");
  console.log("    │    • Consistent response format                        │");
  console.log("    │    • Transaction hash in responses                     │");
  console.log("    │    • Proper error mapping                              │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Backend Service Patterns:");
  console.log("  • Service class abstraction");
  console.log("  • In-memory caching with TTL");
  console.log("  • Cache invalidation on mutations");
  console.log("  • Transaction response handling");
  console.log("  • Error parsing and mapping");
  console.log("  • Service statistics tracking");
  console.log("\n  Production Additions:");
  console.log("  • Redis for distributed caching");
  console.log("  • Circuit breaker pattern");
  console.log("  • Request queuing");
  console.log("  • Health checks");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
