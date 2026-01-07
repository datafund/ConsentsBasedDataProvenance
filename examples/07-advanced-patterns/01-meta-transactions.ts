/**
 * Example: Meta-Transactions
 * Scenario: Advanced Patterns
 * Persona: Developers, Architects
 *
 * This example demonstrates:
 * - EIP-712 typed data signing for consent
 * - Off-chain signature generation
 * - Relayer pattern for gas abstraction
 * - Signature verification concepts
 *
 * Note: This example shows the signing pattern. A real implementation
 * would require a smart contract with signature verification.
 *
 * Scenario:
 * User gives consent without paying gas:
 * 1. User signs consent message off-chain
 * 2. Relayer picks up the signed message
 * 3. Relayer submits transaction (pays gas)
 * 4. Consent recorded on behalf of user
 *
 * Run with:
 * npx hardhat run examples/07-advanced-patterns/01-meta-transactions.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Advanced Pattern: Meta-Transactions");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up meta-transaction scenario...\n");

  const [deployer, user, relayer] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  User (signer):   ${user.address.slice(0, 10)}...`);
  console.log(`  Relayer:         ${relayer.address.slice(0, 10)}...`);

  // Deploy ConsentReceipt (standard version for demonstration)
  const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceiptFactory.deploy();
  await consentReceipt.waitForDeployment();

  console.log(`\nConsentReceipt deployed at: ${await consentReceipt.getAddress()}`);

  // === EIP-712 DOMAIN AND TYPES ===

  // Define EIP-712 domain (would be used by a meta-tx enabled contract)
  const domain = {
    name: "ConsentReceipt",
    version: "1",
    chainId: (await ethers.provider.getNetwork()).chainId,
    verifyingContract: await consentReceipt.getAddress()
  };

  // Define consent message types
  const types = {
    ConsentMessage: [
      { name: "user", type: "address" },
      { name: "purpose", type: "string" },
      { name: "expiryTime", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" }
    ]
  };

  // === SCENARIO ===

  // Step 1: User prepares consent message
  console.log("\n>>> Step 1: User prepares consent message (off-chain)");

  const currentTime = (await ethers.provider.getBlock("latest"))!.timestamp;
  const oneYear = 365 * 24 * 60 * 60;

  const consentMessage = {
    user: user.address,
    purpose: "marketing_communications",
    expiryTime: currentTime + oneYear,
    nonce: 0, // Would be tracked by contract
    deadline: currentTime + 3600 // 1 hour validity for signature
  };

  console.log("\n    Consent Message:");
  console.log(`      User: ${consentMessage.user.slice(0, 10)}...`);
  console.log(`      Purpose: ${consentMessage.purpose}`);
  console.log(`      Expiry: ${new Date(consentMessage.expiryTime * 1000).toLocaleDateString()}`);
  console.log(`      Nonce: ${consentMessage.nonce}`);
  console.log(`      Deadline: ${new Date(consentMessage.deadline * 1000).toLocaleString()}`);

  // Step 2: User signs the message
  console.log("\n>>> Step 2: User signs message with EIP-712");

  // Sign the typed data
  const signature = await user.signTypedData(domain, types, consentMessage);

  console.log(`    ✓ Message signed`);
  console.log(`      Signature: ${signature.slice(0, 30)}...`);

  // Parse signature components
  const sig = ethers.Signature.from(signature);
  console.log(`      v: ${sig.v}`);
  console.log(`      r: ${sig.r.slice(0, 20)}...`);
  console.log(`      s: ${sig.s.slice(0, 20)}...`);

  // Step 3: Verify signature off-chain (relayer verification)
  console.log("\n>>> Step 3: Relayer verifies signature");

  // Recover signer from signature
  const recoveredAddress = ethers.verifyTypedData(domain, types, consentMessage, signature);

  console.log(`    Expected signer: ${user.address}`);
  console.log(`    Recovered signer: ${recoveredAddress}`);
  console.log(`    Signature valid: ${recoveredAddress === user.address ? "YES ✓" : "NO ✗"}`);

  // Step 4: Simulate relayer submitting transaction
  console.log("\n>>> Step 4: Relayer submits transaction (simulated)");
  console.log("    Note: A real meta-tx contract would verify signature on-chain.\n");

  // In a real implementation, the contract would:
  // 1. Verify the signature
  // 2. Check nonce
  // 3. Check deadline
  // 4. Execute consent on behalf of user

  // For demonstration, relayer submits regular transaction
  // (In production, this would be a meta-tx contract call)

  // Relayer pays gas, but consent is for user
  // This simulates what would happen after signature verification
  await consentReceipt.connect(user)["giveConsent(string,uint256)"](
    consentMessage.purpose,
    consentMessage.expiryTime
  );

  console.log("    ✓ Consent recorded on-chain");
  console.log(`      Gas paid by: Relayer (in production)`);
  console.log(`      Consent owner: ${user.address.slice(0, 10)}...`);

  // Step 5: Verify consent was recorded
  console.log("\n>>> Step 5: Verify consent was recorded");

  const hasConsent = await consentReceipt.getConsentStatus(user.address, consentMessage.purpose);
  console.log(`    Consent status: ${hasConsent ? "ACTIVE ✓" : "NOT FOUND"}`);

  // Step 6: Show multiple message types
  console.log("\n>>> Step 6: Additional message types for meta-transactions");

  // Revocation message
  const revokeTypes = {
    RevokeMessage: [
      { name: "user", type: "address" },
      { name: "consentIndex", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" }
    ]
  };

  const revokeMessage = {
    user: user.address,
    consentIndex: 0,
    nonce: 1,
    deadline: currentTime + 3600
  };

  const revokeSignature = await user.signTypedData(domain, revokeTypes, revokeMessage);

  console.log("\n    Revocation Message Signed:");
  console.log(`      Consent Index: ${revokeMessage.consentIndex}`);
  console.log(`      Signature: ${revokeSignature.slice(0, 30)}...`);

  // === META-TX ARCHITECTURE ===

  console.log("\n" + "-".repeat(60));
  console.log("  Meta-Transaction Architecture");
  console.log("-".repeat(60));

  console.log("\n    ┌─────────────────────────────────────────────────────────┐");
  console.log("    │           META-TRANSACTION FLOW                         │");
  console.log("    ├─────────────────────────────────────────────────────────┤");
  console.log("    │                                                          │");
  console.log("    │   User                                                   │");
  console.log("    │     │                                                    │");
  console.log("    │     ▼ (1) Sign consent message (off-chain)               │");
  console.log("    │   ┌─────────────────┐                                    │");
  console.log("    │   │ EIP-712 Message │                                    │");
  console.log("    │   │ + Signature     │                                    │");
  console.log("    │   └────────┬────────┘                                    │");
  console.log("    │            │                                             │");
  console.log("    │            ▼ (2) Send to relayer                         │");
  console.log("    │   ┌─────────────────┐                                    │");
  console.log("    │   │    Relayer      │                                    │");
  console.log("    │   │ (Verifies sig)  │                                    │");
  console.log("    │   └────────┬────────┘                                    │");
  console.log("    │            │                                             │");
  console.log("    │            ▼ (3) Submit transaction                      │");
  console.log("    │   ┌─────────────────┐                                    │");
  console.log("    │   │   Blockchain    │                                    │");
  console.log("    │   │ (Relayer pays)  │                                    │");
  console.log("    │   └────────┬────────┘                                    │");
  console.log("    │            │                                             │");
  console.log("    │            ▼ (4) Consent recorded for user               │");
  console.log("    │   ┌─────────────────┐                                    │");
  console.log("    │   │ ConsentReceipt  │                                    │");
  console.log("    │   │ (User = signer) │                                    │");
  console.log("    │   └─────────────────┘                                    │");
  console.log("    │                                                          │");
  console.log("    └─────────────────────────────────────────────────────────┘");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Users sign EIP-712 typed data off-chain");
  console.log("  • Relayers submit transactions and pay gas");
  console.log("  • Signature verification ensures user intent");
  console.log("  • Nonce prevents replay attacks");
  console.log("  • Deadline ensures signature freshness");
  console.log("  • Enables gasless consent for users");
  console.log("\n  Implementation Notes:");
  console.log("  • Contract needs signature verification function");
  console.log("  • Track nonces per user to prevent replay");
  console.log("  • Consider EIP-2612 permit pattern");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
