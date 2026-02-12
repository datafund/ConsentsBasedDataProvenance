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

# Contract verification
npx hardhat ignition verify ConsentSystem --network sepolia
npx hardhat ignition verify ConsentSystem --network chiado
npx hardhat ignition verify ConsentSystem --network baseSepolia
```

## Architecture

The project consists of four Solidity contracts:

**ConsentReceipt** (`contracts/ConsentReceipt.sol`)
- Basic consent tracking with purpose-based consent grants/revocations
- Supports consent expiry times
- Pagination for large consent arrays

**DataProvenance** (`contracts/DataProvenance.sol`)
- Tracks data ownership and transformation history using content hashes
- DataStatus enum: Active, Restricted, Deleted
- Ownership transfer and access deduplication
- Max limits: 100 transformations, 1000 accessors per data record

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

The Ignition module at `ignition/modules/ConsentSystem.ts` deploys all 9 contracts with proper dependency ordering:

- **Tier 1** (no deps): ConsentReceipt, DataProvenance, KantaraConsentReceipt, ConsentAuditLog, ConsentProxy, PurposeRegistry
- **Tier 2** (needs DataProvenance): DataAccessControl, DataDeletion
- **Tier 3** (needs ConsentReceipt + DataProvenance): IntegratedConsentProvenanceSystem

**Configured testnets**: Sepolia (chainId 11155111), Gnosis Chiado (10200), Base Sepolia (84532). Copy `.env.example` to `.env` and set `TESTNET_DEPLOYER_PRIVATE_KEY` before deploying. This key is for testnets only — mainnet deployments will require a more robust approach (hardware wallet, multisig, or KMS).

## Solidity Version

All contracts use `pragma solidity 0.8.20`.

## Key Security Features

- Input validation on all string parameters (length limits)
- Bounded arrays to prevent DoS (MAX_TRANSFORMATIONS, MAX_ACCESSORS)
- Accessor deduplication to prevent storage bloat
- Nonce-based receipt ID generation (KantaraConsentReceipt)
- Constructor address validation
- Data status management for consent revocation cascade
