/**
 * Example: Anchor Swarm Hash
 * Scenario: Decentralized Storage Provenance
 * Persona: Developers, Data Owners
 *
 * This example demonstrates:
 * - Anchoring a Swarm content hash on-chain as proof of ownership
 * - Recording access by a third party
 * - Transforming content (e.g., encrypting) and linking to the original
 * - Querying the full provenance chain
 *
 * Scenario:
 * A data owner uploads content to Swarm and anchors the hash on-chain.
 * A processor later creates an encrypted version for controlled distribution.
 * The full lineage is preserved: original → encrypted.
 *
 *                    SWARM DATA PROVENANCE LIFECYCLE
 *
 *     ┌──────────────┐         ┌──────────────────────┐
 *     │  Upload to   │         │   Anchor on-chain    │
 *     │    Swarm     │────────>│   registerData()     │
 *     │              │  hash   │                      │
 *     └──────────────┘         │  owner = msg.sender  │
 *                              │  timestamp = now     │
 *                              │  status = ACTIVE     │
 *                              └──────────┬───────────┘
 *                                         │
 *                     ┌───────────────────┬┴──────────────────┐
 *                     v                   v                    v
 *            ┌──────────────┐   ┌──────────────────┐  ┌─────────────────┐
 *            │ Track access  │   │    Transform     │  │ Transfer owner  │
 *            │ recordAccess()│   │recordTransform() │  │transferOwner()  │
 *            │               │   │                  │  │                 │
 *            │ who + when    │   │ original -> new  │  │ old -> new owner│
 *            │ (audit trail) │   │ (linked hashes)  │  │                 │
 *            └──────────────┘   └────────┬─────────┘  └─────────────────┘
 *                                        │
 *                                        v
 *                               ┌──────────────────┐
 *                               │   New version     │
 *                               │  on Swarm + chain │
 *                               │                   │
 *                               │  e.g. encrypted,  │
 *                               │  anonymized,      │
 *                               │  aggregated       │
 *                               └──────────────────┘
 *
 *             ┌─────────────────────────────────────────┐
 *             │          STATUS MANAGEMENT               │
 *             │          setDataStatus()                 │
 *             │                                          │
 *             │  ACTIVE --> RESTRICTED --> DELETED        │
 *             │                                          │
 *             │  - consent revoked -> restrict            │
 *             │  - GDPR deletion request -> delete        │
 *             │  - app layer enforces based on status    │
 *             └─────────────────────────────────────────┘
 *
 *     ┌─────────────────────────────────────────────────────┐
 *     │              PROVENANCE CHAIN                        │
 *     │                                                      │
 *     │  [raw data]  --transform-->  [cleaned]               │
 *     │      |                          |                    │
 *     │      |       --transform-->  [encrypted]             │
 *     │      |                          |                    │
 *     │      |       --transform-->  [aggregated]            │
 *     │      |                                               │
 *     │  Each node: hash, owner, timestamp, status,          │
 *     │             accessors[], transformationLinks[]         │
 *     └─────────────────────────────────────────────────────┘
 *
 * Run with:
 * npx hardhat run examples/10-swarm/01-anchor-swarm-hash.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Example: Anchor Swarm Hash on Chain");
  console.log("=".repeat(60));

  // === SETUP ===
  console.log("\n>>> Setting up...\n");

  const [deployer, dataOwner, processor, reader] = await ethers.getSigners();

  console.log("Actors:");
  console.log(`  Data Owner:  ${dataOwner.address.slice(0, 10)}... (uploads to Swarm)`);
  console.log(`  Processor:   ${processor.address.slice(0, 10)}... (encrypts content)`);
  console.log(`  Reader:      ${reader.address.slice(0, 10)}... (accesses content)`);

  const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
  const dataProvenance = await DataProvenanceFactory.deploy();
  await dataProvenance.waitForDeployment();

  console.log("\nDataProvenance deployed successfully.");

  // === SCENARIO ===

  // Step 1: Data owner uploads content to Swarm and anchors the hash
  console.log("\n>>> Step 1: Anchor Swarm hash on-chain");
  console.log("    Simulating: data owner uploaded a document to Swarm.\n");

  // A real Swarm reference is 64 hex chars (32 bytes) — same size as bytes32.
  // Here we simulate one. In production, this comes from the Swarm upload response.
  const swarmHash = "0xaabbccddee0011223344556677889900aabbccddee00112233445566778899ff";

  const tx1 = await dataProvenance.connect(dataOwner).registerData(
    swarmHash,
    "swarm-document"
  );
  const receipt1 = await tx1.wait();

  console.log(`    ✓ Swarm hash anchored on-chain`);
  console.log(`      Hash:  ${swarmHash.slice(0, 20)}...${swarmHash.slice(-8)}`);
  console.log(`      Type:  swarm-document`);
  console.log(`      Owner: ${dataOwner.address.slice(0, 10)}...`);
  console.log(`      Block: ${receipt1?.blockNumber}`);

  // Step 2: Verify ownership on-chain
  console.log("\n>>> Step 2: Verify ownership on-chain");

  const record = await dataProvenance.getDataRecord(swarmHash);
  const statusMap = ["ACTIVE", "RESTRICTED", "DELETED"];

  console.log(`    Owner:     ${record.owner}`);
  console.log(`    Type:      ${record.dataType}`);
  console.log(`    Status:    ${statusMap[record.status]}`);
  console.log(`    Timestamp: ${new Date(Number(record.timestamp) * 1000).toISOString()}`);
  console.log(`    ✓ Proof of ownership established`);

  // Step 3: Record access by a reader
  console.log("\n>>> Step 3: Record data access");
  console.log("    A reader accesses the Swarm content. The app records this on-chain.\n");

  await dataProvenance.connect(reader).recordAccess(swarmHash);

  const recordAfterAccess = await dataProvenance.getDataRecord(swarmHash);
  console.log(`    ✓ Access recorded`);
  console.log(`      Accessor: ${reader.address.slice(0, 10)}...`);
  console.log(`      Total accessors: ${recordAfterAccess.accessors.length}`);

  // Step 4: Create encrypted version and link it
  console.log("\n>>> Step 4: Create encrypted version (transformation)");
  console.log("    Processor encrypts the Swarm content for controlled distribution.\n");

  // The encrypted version gets a new Swarm hash after re-upload
  const encryptedSwarmHash = "0x1122334455667788990011223344556677889900aabbccddeeff001122334455";

  // Only the owner can record transformations
  await dataProvenance.connect(dataOwner).recordTransformation(
    swarmHash,
    encryptedSwarmHash,
    "encrypted: AES-256-GCM, key managed off-chain"
  );

  console.log(`    ✓ Encrypted version linked to original`);
  console.log(`      Original:  ${swarmHash.slice(0, 20)}...`);
  console.log(`      Encrypted: ${encryptedSwarmHash.slice(0, 20)}...`);
  console.log(`      Transform: AES-256-GCM encryption`);

  // Step 5: View full provenance
  console.log("\n>>> Step 5: View provenance chain");

  const original = await dataProvenance.getDataRecord(swarmHash);
  const encrypted = await dataProvenance.getDataRecord(encryptedSwarmHash);

  console.log("\n    Provenance Chain:");
  console.log("    ═══════════════════════════════════════════════════════");
  console.log(`\n    ┌─── Original (Swarm) ───`);
  console.log(`    │  Hash:   ${swarmHash.slice(0, 30)}...`);
  console.log(`    │  Type:   ${original.dataType}`);
  console.log(`    │  Owner:  ${original.owner.slice(0, 10)}...`);
  console.log(`    │  Status: ${statusMap[original.status]}`);
  console.log(`    │  Access: ${original.accessors.length} reader(s)`);
  console.log("    │");
  console.log("    └──── ↓ [encrypted: AES-256-GCM] ────");
  console.log(`\n    ┌─── Encrypted (Swarm) ───`);
  console.log(`    │  Hash:   ${encryptedSwarmHash.slice(0, 30)}...`);
  console.log(`    │  Type:   ${encrypted.dataType}`);
  console.log(`    │  Owner:  ${encrypted.owner.slice(0, 10)}...`);
  console.log(`    │  Status: ${statusMap[encrypted.status]}`);
  console.log("    │");
  console.log("    └────────────────────────────────────────────────────");

  // Step 6: Owner restricts original after distributing encrypted version
  console.log("\n>>> Step 6: Restrict original content");
  console.log("    Owner restricts the unencrypted version — only the encrypted");
  console.log("    version should be distributed going forward.\n");

  await dataProvenance.connect(dataOwner).setDataStatus(swarmHash, 1); // Restricted

  const restricted = await dataProvenance.getDataRecord(swarmHash);
  console.log(`    ✓ Original hash status: ${statusMap[restricted.status]}`);
  console.log("      Apps should now only serve the encrypted version.");

  // === SUMMARY ===
  console.log("\n" + "=".repeat(60));
  console.log("  Example completed successfully!");
  console.log("=".repeat(60));
  console.log("\n  Key Points:");
  console.log("  • Swarm hashes are bytes32 — they fit directly in DataProvenance");
  console.log("  • On-chain anchor = proof of ownership + timestamp");
  console.log("  • Access tracking provides an audit trail");
  console.log("  • Transformations link original → encrypted versions");
  console.log("  • Status management controls which version apps should serve");
  console.log("  • Actual access enforcement happens at the application layer");
  console.log("  • Encryption + on-chain gating = real access control");
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
