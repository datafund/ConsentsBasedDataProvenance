# Consent-Based Data Provenance System

A comprehensive Ethereum smart contract system for managing user consent and data provenance on-chain. The system provides GDPR-compliant consent tracking, Kantara Initiative-compliant consent receipts, and complete data lineage management.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Contract Documentation](#contract-documentation)
- [Usage Examples](#usage-examples)
- [Testing](#testing)
- [Security](#security)
- [API Reference](#api-reference)
- [License](#license)

## Features

- **Consent Management**: Give, revoke, and track user consent with expiration support
- **Kantara-Compliant Receipts**: Full implementation of Kantara Initiative consent receipt specification with 30+ consent types and 70+ purpose categories
- **Data Provenance**: Track data ownership, transformations, and access history using content hashes
- **EIP-712 Signatures**: Meta-transaction support for gasless consent operations
- **Role-Based Access Control**: Admin, Operator, and Auditor roles with granular permissions
- **Delegated Operations**: Authorize delegates to register data on behalf of users
- **Audit Logging**: Immutable audit trail for all consent and data operations
- **Batch Operations**: Gas-efficient batch processing for multiple operations
- **Data Access Control**: Granular access levels (Read, Transform, Full) with time-limited grants
- **Right to Deletion**: GDPR-compliant data deletion with cryptographic proofs
- **Purpose Registry**: Standardized purpose definitions aligned with GDPR legal bases

## Architecture

The system consists of interconnected smart contracts organized in layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  IntegratedConsentProvenanceSystem                              │
│  (Coordinator linking consent verification with data operations)│
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ConsentReceipt │    │DataProvenance │    │   Supporting  │
│    (Basic)    │    │  (Tracking)   │    │   Contracts   │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Kantara     │    │DataAccessCtrl │    │ ConsentProxy  │
│ConsentReceipt │    │               │    │ (Delegation)  │
└───────────────┘    └───────────────┘    └───────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ DataDeletion  │  │  AuditLog     │  │PurposeRegistry│
└───────────────┘  └───────────────┘  └───────────────┘
```

### Core Contracts

| Contract | Purpose |
|----------|---------|
| `ConsentReceipt` | Basic consent tracking with EIP-712 meta-transactions |
| `KantaraConsentReceipt` | Full Kantara Initiative-compliant consent receipts |
| `DataProvenance` | Data ownership, transformation, and access tracking with RBAC |
| `IntegratedConsentProvenanceSystem` | Coordinator enforcing consent before data operations |

### Supporting Contracts

| Contract | Purpose |
|----------|---------|
| `DataAccessControl` | Granular access level management (Read/Transform/Full) |
| `ConsentProxy` | Purpose-scoped delegation with time limits |
| `ConsentAuditLog` | Immutable audit trail for compliance |
| `DataDeletion` | GDPR right-to-erasure with deletion proofs |
| `PurposeRegistry` | Standardized purpose definitions |

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker and Docker Compose (optional, for containerized development)

## Installation

### Using npm (Local Development)

```bash
# Clone the repository
git clone https://github.com/datafund/ConsentsBasedDataProvenance.git
cd ConsentsBasedDataProvenance

# Install dependencies
npm install

# Compile contracts
npm run compile
```

### Using Docker

```bash
# Start the Hardhat node
docker-compose up -d

# Compile contracts
docker-compose exec hardhat npx hardhat compile

# Run tests
docker-compose exec hardhat npx hardhat test
```

## Quick Start

### 1. Start a Local Node

```bash
# Using npm
npm run node

# Using Docker
docker-compose up
```

### 2. Deploy Contracts

```bash
# Using npm
npm run deploy:local

# Using Docker
docker-compose exec hardhat npx hardhat run scripts/deploy.ts --network localhost
```

### 3. Interact with Contracts

```typescript
import { ethers } from "hardhat";

// Get deployed contracts
const consentReceipt = await ethers.getContractAt("ConsentReceipt", CONSENT_ADDRESS);
const dataProvenance = await ethers.getContractAt("DataProvenance", PROVENANCE_ADDRESS);

// Give consent for a purpose
await consentReceipt.giveConsent("analytics");

// Register data with consent verification
const dataHash = ethers.keccak256(ethers.toUtf8Bytes("my-data"));
await integratedSystem.registerDataWithConsent(dataHash, "document", "analytics");
```

## Contract Documentation

### ConsentReceipt

Basic consent management with purpose-based tracking and EIP-712 signature support.

```solidity
// Give consent for a purpose
function giveConsent(string memory _purpose) public;
function giveConsent(string memory _purpose, uint256 _expiryTime) public;

// Give consent via meta-transaction (gasless)
function giveConsentBySig(
    address _user,
    string memory _purpose,
    uint256 _expiryTime,
    uint256 _deadline,
    uint8 _v, bytes32 _r, bytes32 _s
) public;

// Revoke consent
function revokeConsent(uint256 _index) public;

// Check consent status
function getConsentStatus(address _user, string memory _purpose) public view returns (bool);

// Batch operations
function batchGiveConsent(string[] memory _purposes, uint256[] memory _expiryTimes) public;
function batchRevokeConsent(uint256[] memory _indices) public;
```

### KantaraConsentReceipt

Full Kantara Initiative specification with 30 consent types and 70+ purpose categories.

```solidity
// Give comprehensive consent
function giveConsent(
    address _dataController,
    Purpose[] memory _purposes,
    bytes32[] memory _piCategories,
    ConsentType _consentType,
    uint256 _expiryTime,
    bool _thirdPartyDisclosure,
    string memory _policyUrl
) public returns (bytes32 receiptId);

// Check consent validity
function hasValidConsent(
    address _dataSubject,
    address _dataController,
    Purpose _purpose
) public view returns (bool);

// Revoke consent
function revokeConsent(bytes32 _receiptId) public;
```

**Consent Types Include:**
- `Express`, `Implicit`, `ThirdParty`, `Verbal`
- `ExplicitAffirmative`, `InformedExplicit`, `DoubleOptIn`
- `ParentalConsent`, `ProxyConsent`, `DynamicConsent`
- And 20+ more...

**Purpose Categories Include:**
- Service & Contract: `ServiceProvision`, `ContractFulfillment`, `CustomerSupport`
- Legal: `LegalCompliance`, `RegulatoryReporting`, `AuditingInternal`
- Marketing: `DirectMarketing`, `AdvertisingPersonalization`, `MarketResearch`
- And 60+ more...

### DataProvenance

Data lineage tracking with RBAC, delegated ownership, and bidirectional lineage traversal.

```solidity
// Register data
function registerData(bytes32 _dataHash, string memory _dataType) public;
function registerDataFor(bytes32 _dataHash, string memory _dataType, address _actualOwner) public;

// Record data transformation (single source → derived output)
function recordTransformation(
    bytes32 _originalDataHash,
    bytes32 _newDataHash,
    string memory _transformation
) public;

// Record merge/join transformation (multiple sources → single output)
function recordMergeTransformation(
    bytes32[] memory _sourceDataHashes,
    bytes32 _newDataHash,
    string memory _transformation,
    string memory _newDataType
) public;

// Lineage traversal
function getTransformationLinks(bytes32 _dataHash) public view returns (TransformationLink[] memory); // Forward: parent → children (with descriptions)
function getChildHashes(bytes32 _dataHash) public view returns (bytes32[] memory);                     // Forward: parent → children (hashes only)
function getTransformationParents(bytes32 _dataHash) public view returns (bytes32[] memory);           // Reverse: child → parents

// Record data access
function recordAccess(bytes32 _dataHash) public;

// Ownership management
function transferDataOwnership(bytes32 _dataHash, address _newOwner) public;
function setDataStatus(bytes32 _dataHash, DataStatus _newStatus) public;

// Delegation
function setDelegate(address _delegate, bool _authorized) public;

// RBAC
function grantRole(bytes32 role, address account) public; // Admin only
function revokeRole(bytes32 role, address account) public; // Admin only
function operatorSetDataStatus(bytes32 _dataHash, DataStatus _newStatus) public; // Operator role

// Batch operations
function batchRegisterData(bytes32[] memory _dataHashes, string[] memory _dataTypes) public;
function batchRecordAccess(bytes32[] memory _dataHashes) public;
```

**Lineage Traversal:**

| Direction | Method | Returns |
|-----------|--------|---------|
| Forward (parent → children) | `getChildHashes(hash)` | `bytes32[]` of child hashes |
| Forward (with descriptions) | `getTransformationLinks(hash)` | `TransformationLink[]` (hash + description) |
| Reverse (child → parents) | `getTransformationParents(hash)` | `bytes32[]` — 1 element for transforms, N for merges, empty for roots |

**Data Statuses:**
- `Active`: Normal operational state
- `Restricted`: Limited access (e.g., after consent revocation)
- `Deleted`: Marked for deletion

**Roles:**
- `ADMIN_ROLE`: Can grant/revoke roles
- `OPERATOR_ROLE`: Can change data status for compliance
- `AUDITOR_ROLE`: Read-only access for auditing

### IntegratedConsentProvenanceSystem

Enforces consent verification before all data operations.

```solidity
// Consent-verified operations
function registerDataWithConsent(
    bytes32 _dataHash,
    string memory _dataType,
    string memory _consentPurpose
) public;

function registerDataForWithConsent(
    bytes32 _dataHash,
    string memory _dataType,
    string memory _consentPurpose,
    address _actualOwner
) public;

function accessDataWithConsent(bytes32 _dataHash, string memory _consentPurpose) public;

function transformDataWithConsent(
    bytes32 _originalDataHash,
    bytes32 _newDataHash,
    string memory _transformation,
    string memory _consentPurpose
) public;

function mergeDataWithConsent(
    bytes32[] memory _sourceDataHashes,
    bytes32 _newDataHash,
    string memory _transformation,
    string memory _newDataType,
    string memory _consentPurpose
) public;

// Restrict data after consent revocation
function restrictDataForPurpose(string memory _consentPurpose) public;
```

## Usage Examples

### Basic Consent Flow

```typescript
// User gives consent for marketing
await consentReceipt.connect(user)["giveConsent(string)"]("marketing");

// Check if consent exists
const hasConsent = await consentReceipt.getConsentStatus(user.address, "marketing");
console.log("Has marketing consent:", hasConsent); // true

// Revoke consent
await consentReceipt.connect(user).revokeConsent(0);
```

### Consent with Expiration

```typescript
// Give consent that expires in 30 days
const thirtyDays = 30 * 24 * 60 * 60;
const block = await ethers.provider.getBlock("latest");
const expiryTime = block.timestamp + thirtyDays;

await consentReceipt.connect(user)["giveConsent(string,uint256)"]("analytics", expiryTime);
```

### Meta-Transaction (Gasless Consent)

```typescript
// User signs consent off-chain
const domain = {
  name: "ConsentReceipt",
  version: "1",
  chainId: (await ethers.provider.getNetwork()).chainId,
  verifyingContract: await consentReceipt.getAddress()
};

const types = {
  Consent: [
    { name: "user", type: "address" },
    { name: "purpose", type: "string" },
    { name: "expiryTime", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
};

const nonce = await consentReceipt.getNonce(user.address);
const deadline = Math.floor(Date.now() / 1000) + 3600;

const value = {
  user: user.address,
  purpose: "analytics",
  expiryTime: 0,
  nonce: nonce,
  deadline: deadline
};

const signature = await user.signTypedData(domain, types, value);
const sig = ethers.Signature.from(signature);

// Relayer submits on behalf of user
await consentReceipt.connect(relayer).giveConsentBySig(
  user.address,
  "analytics",
  0,
  deadline,
  sig.v, sig.r, sig.s
);
```

### Data Registration with Consent

```typescript
// User gives consent
await consentReceipt.connect(user)["giveConsent(string)"]("analytics");

// Register data (requires consent)
const dataHash = ethers.keccak256(ethers.toUtf8Bytes("user-document-content"));
await integratedSystem.connect(user).registerDataWithConsent(
  dataHash,
  "document",
  "analytics"
);

// Track transformation
const newHash = ethers.keccak256(ethers.toUtf8Bytes("transformed-content"));
await integratedSystem.connect(user).transformDataWithConsent(
  dataHash,
  newHash,
  "anonymization",
  "analytics"
);
```

### Delegated Registration

```typescript
// Owner authorizes delegate
await dataProvenance.connect(owner).setDelegate(delegate.address, true);
await dataProvenance.connect(owner).setDelegate(await integratedSystem.getAddress(), true);

// Owner gives consent
await consentReceipt.connect(owner)["giveConsent(string)"]("research");

// Delegate registers data on owner's behalf
const dataHash = ethers.keccak256(ethers.toUtf8Bytes("research-data"));
await integratedSystem.connect(delegate).registerDataForWithConsent(
  dataHash,
  "research-data",
  "research",
  owner.address
);
```

### Kantara-Compliant Consent

```typescript
// Give comprehensive consent following Kantara specification
const tx = await kantaraConsent.connect(user).giveConsent(
  dataControllerAddress,
  [0, 1], // ServiceProvision, ContractFulfillment
  [ethers.keccak256(ethers.toUtf8Bytes("email")), ethers.keccak256(ethers.toUtf8Bytes("name"))],
  10, // ExplicitAffirmative consent type
  expiryTime,
  true, // Allow third-party disclosure
  "https://example.com/privacy-policy"
);

const receipt = await tx.wait();
const receiptId = receipt.logs[0].args[0]; // Get receipt ID from event

// Verify consent
const isValid = await kantaraConsent.hasValidConsent(
  user.address,
  dataControllerAddress,
  0 // ServiceProvision
);
```

## Interactive Examples

The `examples/` directory contains **40+ runnable TypeScript scripts** demonstrating real-world usage across multiple industries:

| Category | Examples | Description |
|----------|----------|-------------|
| [Getting Started](examples/01-getting-started/) | 4 | Basic consent, expiry, revocation, integrated system |
| [Healthcare](examples/02-healthcare/) | 5 | Patient consent, HIPAA, medical records, deletion |
| [Financial Services](examples/03-financial-services/) | 5 | KYC, credit checks, regulatory reporting |
| [Marketing](examples/04-marketing/) | 5 | Email consent, cookies, GDPR/CCPA compliance |
| [Research](examples/05-research/) | 4 | Study enrollment, anonymization, multi-institution |
| [IoT & Supply Chain](examples/06-iot-supply-chain/) | 4 | Device registration, sensor data, manufacturing |
| [Advanced Patterns](examples/07-advanced-patterns/) | 5 | Meta-transactions, delegation, RBAC, batch ops |
| [Compliance & Audit](examples/08-compliance-audit/) | 5 | GDPR, Kantara, audit queries, breach investigation |
| [Integration Patterns](examples/09-integration-patterns/) | 4 | Events, backend services, error handling |

### Running Examples

```bash
# Start local blockchain
docker-compose up -d

# Run any example via npm script
npm run example:basic-consent
npm run example:healthcare:hipaa
npm run example:compliance:gdpr
npm run example:integration:events

# Or run directly
npx hardhat run examples/01-getting-started/04-integrated-system.ts --network localhost
```

See [`examples/README.md`](examples/README.md) for the complete guide.

## Testing

### Run All Tests

```bash
# Using npm
npm test

# Using Docker
docker-compose exec hardhat npx hardhat test
```

### Run Specific Test Files

```bash
# Run security tests
npx hardhat test test/Security.test.ts

# Run integration tests
npx hardhat test test/Integration.test.ts

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

### Test Coverage

```bash
npm run test:coverage
```

### Test Suite Structure

```
test/
├── ConsentReceipt.test.ts        # Basic consent tests
├── KantaraConsentReceipt.test.ts # Kantara compliance tests
├── DataProvenance.test.ts        # Data tracking tests
├── IntegratedConsentProvenanceSystem.test.ts
├── Integration.test.ts           # End-to-end tests
├── Security.test.ts              # Security/attack tests
├── ConsentAuditLog.test.ts
├── ConsentProxy.test.ts
├── DataAccessControl.test.ts
├── DataDeletion.test.ts
└── PurposeRegistry.test.ts
```

**Current Test Count: 299 tests**

## Limits and Bounds

All contracts enforce limits to control gas costs and prevent abuse. These are per-record or per-call — they don't limit the overall system size.

### Per-Record Limits

| Limit | Value | Meaning |
|-------|-------|---------|
| `MAX_TRANSFORMATIONS` | 100 | Max transformations branching from a single data record. Each new version is its own record with its own budget, so provenance chains can be arbitrarily deep. |
| `MAX_MERGE_SOURCES` | 50 | Max source datasets in a single `recordMergeTransformation` call. |
| `MAX_ACCESSORS` | 1000 | Max unique addresses recorded as accessors of a single data record. Duplicates are deduplicated automatically. |
| `MAX_ACCESS_DURATION` | 2 years | Longest access grant via DataAccessControl. |
| `MAX_DELEGATION_DURATION` | 1 year | Longest consent delegation via ConsentProxy. |

### String Length Limits

| Field | Max Length |
|-------|-----------|
| `dataType` | 64 chars |
| `transformation` | 256 chars |
| `purpose` (ConsentReceipt) | 256 chars |
| `policyUrl` (KantaraConsentReceipt) | 512 chars |

### Batch Operation Limits

| Operation | Max Items per Call |
|-----------|-------------------|
| `batchRegisterData` | 50 |
| `batchRecordAccess` | 100 |
| `batchSetDataStatus` | 50 |
| `batchGiveConsent` | 50 |
| `batchRevokeConsent` | 50 |
| Kantara `batchRevokeConsent` | 50 |
| Kantara `batchCheckConsent` | 100 |
| Kantara purposes per receipt | 20 |
| Kantara PI categories per receipt | 50 |

### What's Not Limited

- **Total records** — no cap on how many data records exist system-wide
- **Provenance chain depth** — each transformation creates a new record, so chains can go as deep as needed
- **Total users** — no cap on addresses interacting with the contracts
- **Contract storage** — grows as needed (each write costs gas, reads are free)

## Security

### Security Features

1. **Input Validation**
   - String length limits (see table above)
   - Zero address checks
   - Empty input rejection

2. **Bounded Arrays**
   - All per-record and batch limits enforced (see table above)

3. **Access Control**
   - Role-Based Access Control (RBAC) for administrative functions
   - Owner-only operations for data modification
   - Delegate authorization with revocation

4. **Replay Protection**
   - Nonce-based receipt ID generation
   - EIP-712 signatures with deadline and nonce
   - DOMAIN_SEPARATOR includes chainId

5. **State Management**
   - Accessor deduplication prevents storage bloat
   - Status change validation (no duplicate state changes)
   - Expiration handling for consent and delegations

### Security Test Coverage

The security test suite (`test/Security.test.ts`) includes 91 tests covering:

- **RBAC Bypass Attempts**: Non-admin role manipulation, privilege escalation
- **Delegation Exploits**: Unauthorized delegation, revoked delegate actions
- **Ownership Attacks**: Non-owner transfers, status changes
- **DoS/Resource Exhaustion**: Array bounds, batch limits
- **EIP-712 Signature Attacks**: Replay, expired signatures, wrong signer, tampering
- **Cross-Contract Attacks**: State desynchronization, front-running
- **Input Validation**: Zero values, empty strings, length limits

### Known Limitations

1. **On-Chain Data**: All consent records are stored on-chain. Consider privacy implications.
2. **Gas Costs**: Large batch operations may exceed block gas limits.
3. **Immutability**: Once registered, data hashes cannot be modified (by design).

## API Reference

### Events

#### ConsentReceipt Events
```solidity
event ConsentGiven(address indexed user, string purpose, uint256 timestamp, uint256 expiryTime);
event ConsentRevoked(address indexed user, string purpose, uint256 timestamp);
event ConsentGivenBySig(address indexed user, string purpose, address indexed relayer);
```

#### DataProvenance Events
```solidity
event DataRegistered(bytes32 indexed dataHash, address indexed owner, string dataType);
event DataTransformed(bytes32 indexed originalDataHash, bytes32 indexed newDataHash, string transformation);
event DataMerged(bytes32 indexed newDataHash, bytes32[] sourceDataHashes, string transformation);
event DataAccessed(bytes32 indexed dataHash, address indexed accessor);
event DataStatusChanged(bytes32 indexed dataHash, DataStatus oldStatus, DataStatus newStatus);
event DataOwnershipTransferred(bytes32 indexed dataHash, address indexed previousOwner, address indexed newOwner);
event DelegateAuthorized(address indexed owner, address indexed delegate, bool authorized);
event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
```

#### KantaraConsentReceipt Events
```solidity
event ConsentGiven(bytes32 indexed receiptId, address indexed dataSubject, address indexed dataController, uint256 expiryTime);
event ConsentRevoked(bytes32 indexed receiptId, address indexed dataSubject);
event ConsentUpdated(bytes32 indexed receiptId, address indexed dataSubject);
```

### Error Messages

| Error | Contract | Meaning |
|-------|----------|---------|
| `Purpose cannot be empty` | ConsentReceipt | Empty purpose string provided |
| `Purpose too long` | ConsentReceipt | Purpose exceeds 256 characters |
| `Expiry must be in future` | ConsentReceipt | Expiry timestamp is in the past |
| `Invalid consent index` | ConsentReceipt | Index out of bounds |
| `Consent already revoked` | ConsentReceipt | Attempting to revoke inactive consent |
| `Signature expired` | ConsentReceipt | EIP-712 signature deadline passed |
| `Invalid signature` | ConsentReceipt | Signature verification failed |
| `Invalid data hash` | DataProvenance | Zero hash provided |
| `Data type cannot be empty` | DataProvenance | Empty data type string |
| `Data already registered` | DataProvenance | Hash already exists |
| `Not the owner` | DataProvenance | Caller is not data owner |
| `Data is not active` | DataProvenance | Data status is Restricted or Deleted |
| `Max transformations reached` | DataProvenance | 100 transformation limit hit |
| `Max accessors reached` | DataProvenance | 1000 accessor limit hit |
| `Not authorized delegate` | DataProvenance | Caller not authorized to act for owner |
| `AccessControl: admin role required` | DataProvenance | Caller lacks admin role |
| `No valid consent for this purpose` | IntegratedSystem | Required consent not found |
| `Consent still valid` | IntegratedSystem | Cannot restrict while consent active |

## Deployment

### Local Deployment

```bash
# Legacy deploy script
npm run deploy:local

# Hardhat Ignition (deploys all 9 contracts with dependency ordering)
npm run node                        # Start local node in another terminal
npm run deploy:ignition:local
```

### Testnet Deployment

Supported testnets: **Sepolia**, **Gnosis Chiado**, **Base Sepolia**.

```bash
# 1. Copy .env.example and configure
cp .env.example .env
# Edit .env: set TESTNET_DEPLOYER_PRIVATE_KEY and (optionally) RPC URLs / API keys

# 2. Deploy to a testnet
npm run deploy:ignition:sepolia
npm run deploy:ignition:chiado
npm run deploy:ignition:baseSepolia
```

Ignition deploys all 9 contracts in dependency order:
- **Batch 1**: ConsentReceipt, DataProvenance, KantaraConsentReceipt, ConsentAuditLog, ConsentProxy, PurposeRegistry
- **Batch 2**: DataAccessControl, DataDeletion, IntegratedConsentProvenanceSystem

Deployed addresses are saved to `ignition/deployments/chain-<chainId>/deployed_addresses.json` and a human-readable summary is auto-generated at [`deployments.md`](deployments.md).

### Contract Verification

Contracts can be verified on Blockscout (no API key needed) — verification is manual, not automatic. Base Sepolia and Chiado use Blockscout. Sepolia uses Etherscan (requires `ETHERSCAN_API_KEY`).

```bash
# Verify individual contracts on Blockscout (no API key needed)
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS>
npx hardhat verify --network chiado <CONTRACT_ADDRESS>

# Verify on Etherscan (requires ETHERSCAN_API_KEY in .env)
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Deployed Contracts

See [`deployments.md`](deployments.md) for the auto-generated reference. Summary:

| Network | Contract | Address | Explorer |
|---------|----------|---------|----------|
| Base Sepolia | ConsentAuditLog | `0x050384eA3e3ab6706afA6dB9DfA9FCd3A24901f4` | [Blockscout](https://base-sepolia.blockscout.com/address/0x050384eA3e3ab6706afA6dB9DfA9FCd3A24901f4) |
| Base Sepolia | ConsentProxy | `0x5B96F9d0b896f4AD9E0fE368259479eF369853FE` | [Blockscout](https://base-sepolia.blockscout.com/address/0x5B96F9d0b896f4AD9E0fE368259479eF369853FE) |
| Base Sepolia | ConsentReceipt | `0xa88a0D18cABcd5d2eA06A028210713d98FccF5BF` | [Blockscout](https://base-sepolia.blockscout.com/address/0xa88a0D18cABcd5d2eA06A028210713d98FccF5BF) |
| Base Sepolia | DataProvenance | `0xD4a724CD7f5C4458cD2d884C2af6f011aC3Af80a` | [Blockscout](https://base-sepolia.blockscout.com/address/0xD4a724CD7f5C4458cD2d884C2af6f011aC3Af80a) |
| Base Sepolia | KantaraConsentReceipt | `0x64CC6738E43dc2c6D2E70120f351Bc85f563481C` | [Blockscout](https://base-sepolia.blockscout.com/address/0x64CC6738E43dc2c6D2E70120f351Bc85f563481C) |
| Base Sepolia | PurposeRegistry | `0x50F132Dc634C80d940b93551D1659B87c82599F1` | [Blockscout](https://base-sepolia.blockscout.com/address/0x50F132Dc634C80d940b93551D1659B87c82599F1) |
| Base Sepolia | DataAccessControl | `0xe3056301801b11a2dF5c31A9E86f46c9c604414A` | [Blockscout](https://base-sepolia.blockscout.com/address/0xe3056301801b11a2dF5c31A9E86f46c9c604414A) |
| Base Sepolia | DataDeletion | `0x77CD9F9c67D4F3067f4088dfBE9B54bb5AC99aBf` | [Blockscout](https://base-sepolia.blockscout.com/address/0x77CD9F9c67D4F3067f4088dfBE9B54bb5AC99aBf) |
| Base Sepolia | IntegratedConsentProvenanceSystem | `0x91EafB1BcE558c183AA04c3fC090DE31671AfdD7` | [Blockscout](https://base-sepolia.blockscout.com/address/0x91EafB1BcE558c183AA04c3fC090DE31671AfdD7) |

#### Previous Deployments (Superseded)

| Network | Contract | Address | Explorer | Notes |
|---------|----------|---------|----------|-------|
| Base Sepolia | DataProvenance (v1) | `0x9a3c6F47B69211F05891CCb7aD33596290b9fE64` | [Blockscout](https://base-sepolia.blockscout.com/address/0x9a3c6F47B69211F05891CCb7aD33596290b9fE64#code) | Pre-TransformationLink struct, standalone deploy |

### ABIs

ABIs are available from multiple sources:
- **`dist/abis/<ContractName>.json`** — ABI-only JSON files, auto-generated after each deployment (`npm run post-deploy`)
- **Blockscout** (verified contracts only): Contract page → "Contract" tab → ABI section, or API: `https://base-sepolia.blockscout.com/api?module=contract&action=getabi&address=<ADDRESS>`
- **Local build**: Run `npx hardhat compile`, full artifacts in `artifacts/contracts/<Name>.sol/<Name>.json`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- All contracts use Solidity 0.8.20
- Follow existing code style and patterns
- Add tests for new functionality
- Update documentation as needed

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Kantara Initiative](https://kantarainitiative.org/) - Consent receipt specification
- [OpenZeppelin](https://openzeppelin.com/) - Security patterns and best practices
- [Hardhat](https://hardhat.org/) - Development environment
