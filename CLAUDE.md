# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Consent-based data provenance system implemented as Ethereum smart contracts. The system tracks user consent and data lineage on-chain, with consent receipts following the Kantara Initiative specification.

## Build & Test Commands

```bash
# Docker commands (Hardhat runs in Docker)
docker-compose up                                    # Start Hardhat node on port 8545
docker-compose exec hardhat npx hardhat compile      # Compile contracts
docker-compose exec hardhat npx hardhat test         # Run all tests
docker-compose exec hardhat npx hardhat test test/ConsentReceipt.test.ts  # Run single test file
docker-compose exec hardhat npx hardhat run scripts/deploy.ts --network localhost  # Deploy

# Or run tests directly with Docker Compose profile
docker-compose --profile test run test

# Local development (if npm installed locally)
npm install
npx hardhat compile
npx hardhat test
npx hardhat node                                     # Start local node
npx hardhat run scripts/deploy.ts --network localhost

# Hardhat Ignition deployments
npx hardhat ignition deploy ignition/modules/ConsentSystem.ts --network localhost   # Local
npx hardhat ignition deploy ignition/modules/ConsentSystem.ts --network sepolia     # Sepolia
npx hardhat ignition deploy ignition/modules/ConsentSystem.ts --network chiado      # Gnosis Chiado
npx hardhat ignition deploy ignition/modules/ConsentSystem.ts --network baseSepolia # Base Sepolia

# Contract verification (via Blockscout, no API key needed)
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS>
npx hardhat verify --network chiado <CONTRACT_ADDRESS>
# Sepolia uses Etherscan (requires ETHERSCAN_API_KEY in .env)
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## Architecture

The project consists of four Solidity contracts:

**ConsentReceipt** (`contracts/ConsentReceipt.sol`)
- Basic consent tracking with purpose-based consent grants/revocations
- Supports consent expiry times
- Pagination for large consent arrays

**DataProvenance** (`contracts/DataProvenance.sol`)
- Tracks data ownership and transformation history using content hashes
- `TransformationLink` struct stores child hash + description for bidirectional lineage traversal
- `storageRef` field on `DataRecord` links content hash to storage location (e.g. Swarm reference)
- `storageRefToDataHash` reverse mapping enables bidirectional lookup (storage ref → data hash)
- `setStorageRef()` allows set-once attachment of storage ref to existing records (e.g. after transformation)
- `recordMergeTransformation()` for multi-source merge/join operations (up to 50 sources)
- Forward traversal: `getTransformationLinks()`, `getChildHashes()`; Reverse: `getTransformationParents()`
- DataStatus enum: Active, Restricted, Deleted
- Ownership transfer and access deduplication
- Max limits: 100 transformations, 50 merge sources, 1000 accessors per data record

**IntegratedConsentProvenanceSystem** (`contracts/IntegratedConsentProvenanceSystem.sol`)
- Coordinator contract linking consent and provenance
- All data operations require valid consent for the stated purpose
- Tracks consent purpose per data hash for audit trail
- `restrictDataForPurpose()` to cascade consent revocation to data

**KantaraConsentReceipt** (`contracts/KantaraConsentReceipt.sol`)
- Full Kantara-compliant consent receipt implementation
- 30 ConsentType variants, 70+ Purpose enum values
- Nonce-based unique receipt IDs to prevent collisions
- Supports expiry, third-party disclosure flags, policy URLs

## Contract Dependencies

IntegratedConsentProvenanceSystem requires deployed ConsentReceipt and DataProvenance addresses at construction.

## Deployment (Hardhat Ignition)

The Ignition module deploys all 9 contracts with proper dependency ordering:

- **Tier 1** (no deps): ConsentReceipt, DataProvenance, KantaraConsentReceipt, ConsentAuditLog, ConsentProxy, PurposeRegistry
- **Tier 2** (needs DataProvenance): DataAccessControl, DataDeletion
- **Tier 3** (needs ConsentReceipt + DataProvenance): IntegratedConsentProvenanceSystem

**Configured testnets**: Sepolia (chainId 11155111), Gnosis Chiado (10200), Base Sepolia (84532). Copy `.env.example` to `.env` and set `TESTNET_DEPLOYER_PRIVATE_KEY` before deploying. This key is for testnets only — mainnet deployments will require a more robust approach (hardware wallet, multisig, or KMS).

A standalone `ignition/modules/DataProvenance.ts` module is also available for deploying just DataProvenance.

### Deployment Procedure

When contract bytecodes have changed (new features, bug fixes), a fresh deployment is required since contracts are not upgradeable. Follow these steps:

**1. Compile and test**
```bash
npx hardhat compile
npx hardhat test                       # In-memory Hardhat
npx hardhat test --network localhost   # Against persistent local node
```

**2. Create a new Ignition module**

Ignition tracks deployed bytecodes per module. If any contract bytecodes changed since the last deployment, the existing module will fail reconciliation. Create a new versioned module:

```bash
cp ignition/modules/ConsentSystemV<N>.ts ignition/modules/ConsentSystemV<N+1>.ts
```

Edit the file: change the module name string from `"ConsentSystemV<N>"` to `"ConsentSystemV<N+1>"`. The contract list and dependency wiring stay the same.

**3. Deploy to testnet**
```bash
echo "y" | npx hardhat ignition deploy ignition/modules/ConsentSystemV<N+1>.ts --network baseSepolia
```

Base Sepolia is slow to confirm transactions. Ignition will fail with `IGN405` nonce errors when it sends transactions faster than the chain confirms them. This is normal — **Ignition is resumable**. Wait 30 seconds and re-run the same command. It picks up where it left off. Expect 4-8 retries for a full 9-contract deployment.

**4. Run post-deploy**
```bash
npm run post-deploy
```

This auto-generates:
- `deployments.md` — human-readable deployed addresses with explorer links
- `dist/abis/*.json` — ABI-only JSON files for each contract

**5. Update README.md**

Update the "Deployed Contracts" table with the new V(N+1) addresses. Move the previous addresses to the "Previous Deployments (Superseded)" section. Only keep the key contracts (DataProvenance, IntegratedSystem) in the previous deployments list to avoid bloat.

**6. Commit and push**
```bash
git add ignition/modules/ConsentSystemV<N+1>.ts deployments.md dist/abis/ \
        ignition/deployments/chain-84532/deployed_addresses.json README.md
git commit -m "feat: deploy V<N+1> contracts to Base Sepolia"
git push origin main
```

**7. Notify downstream repos**

If contract ABIs changed, comment on the open issues in downstream repos with the new ABI and addresses:
- `datafund/swarm_provenance_SDK`
- `datafund/swarm_provenance_MCP`
- `datafund/swarm_provenance_CLI`
- `datafund/dataprovenance-app`

**8. Verify contracts (optional)**
```bash
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS>
```
Blockscout verification requires no API key. Verify at minimum: DataProvenance, IntegratedConsentProvenanceSystem.

## Deployed Contracts

See [`deployments.md`](deployments.md) for all deployed addresses with explorer links (auto-generated by `scripts/post-deploy.ts`).

Raw Ignition state is in `ignition/deployments/chain-<chainId>/deployed_addresses.json`.

| Network | Chain ID | Explorer |
|---------|----------|----------|
| Base Sepolia | 84532 | [Blockscout](https://base-sepolia.blockscout.com) |

## Contract Verification & ABIs

Contracts can be verified on Blockscout (no API key needed) — verification is manual, not automatic. Some deployed contracts are already verified.

ABIs are available from multiple sources:
- **`dist/abis/<ContractName>.json`** — ABI-only JSON files, auto-generated by `npm run post-deploy`
- **Blockscout** (verified contracts only): "Contract" tab → ABI section, or via API: `https://base-sepolia.blockscout.com/api?module=contract&action=getabi&address=<ADDRESS>`
- **Local**: Run `npx hardhat compile`, then find full artifacts in `artifacts/contracts/<Name>.sol/<Name>.json`

## Solidity Version

All contracts use `pragma solidity 0.8.20`.

## Limits and Bounds

Per-record: `MAX_TRANSFORMATIONS` = 100 (per record, chains are unbounded), `MAX_MERGE_SOURCES` = 50, `MAX_ACCESSORS` = 1000, `MAX_ACCESS_DURATION` = 2 years, `MAX_DELEGATION_DURATION` = 1 year. Strings: `dataType` 64, `transformation` 256, `purpose` 256, `policyUrl` 512. Batch ops: 50-100 items per call. No limit on total records, chain depth, or users. See README.md for full table.

## Key Security Features

- Input validation on all string parameters (length limits)
- Bounded arrays to prevent DoS (see limits above)
- Accessor deduplication to prevent storage bloat
- Nonce-based receipt ID generation (KantaraConsentReceipt)
- Constructor address validation
- Data status management for consent revocation cascade
