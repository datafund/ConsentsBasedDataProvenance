# Real-World Usage Examples

This directory contains executable TypeScript examples demonstrating how to use the Consent-Based Data Provenance System in real-world scenarios across multiple industries.

## Quick Start

```bash
# Start a local Hardhat node
npm run node

# In another terminal, run any example
npx hardhat run examples/01-getting-started/01-basic-consent.ts --network localhost
```

## Example Categories

### [01 - Getting Started](./01-getting-started/)
**For: End Users, Developers**

Basic consent workflows to understand the fundamentals:
- Basic consent grant and verification
- Consent with expiration times
- Revoking consent

### [02 - Healthcare](./02-healthcare/)
**For: End Users, Developers, Business Operators, Compliance Officers, Regulators**

HIPAA-compliant healthcare data management:
- Patient multi-purpose consent (treatment, billing, research)
- Medical record registration with consent verification
- Research data sharing with proper consent
- HIPAA audit trail generation
- Right to deletion (GDPR Article 17)

### [03 - Financial Services](./03-financial-services/)
**For: End Users, Developers, Business Operators, Compliance Officers, Regulators**

KYC, credit, and regulatory compliance:
- Know Your Customer (KYC) consent
- Third-party credit bureau data sharing
- Transaction data provenance tracking
- Regulatory reporting with audit evidence
- Account closure with deletion proofs

### [04 - Marketing](./04-marketing/)
**For: End Users, Developers, Business Operators, Compliance Officers**

GDPR-compliant marketing consent:
- Email marketing opt-in/opt-out
- Cookie consent management
- Ad personalization preferences
- Third-party data sharing consent
- User preference center implementation

### [05 - Research](./05-research/)
**For: End Users, Developers, Business Operators, Compliance Officers**

Academic and clinical research scenarios:
- Study enrollment with informed consent
- Data anonymization tracking
- Multi-institution data sharing
- Publication consent management

### [06 - IoT & Supply Chain](./06-iot-supply-chain/)
**For: Developers, Business Operators**

Device data and product tracking:
- IoT device data registration
- Sensor data provenance
- Manufacturing supply chain tracking
- Smart city citizen consent

### [07 - Advanced Patterns](./07-advanced-patterns/)
**For: Developers, Business Operators**

Production-ready implementation patterns:
- Meta-transactions (gasless consent via EIP-712)
- Delegated consent (power of attorney)
- Batch operations for scale
- Role-Based Access Control (RBAC)
- Granular data access levels

### [08 - Compliance & Audit](./08-compliance-audit/)
**For: Developers, Compliance Officers, Regulators**

Regulatory compliance demonstrations:
- GDPR compliance workflows
- Kantara-compliant consent receipts
- Audit log queries for investigations
- Regulatory report generation
- Breach investigation forensics

### [09 - Integration Patterns](./09-integration-patterns/)
**For: Developers**

Backend integration guidance:
- Event-driven architectures
- Backend service integration
- Multi-contract orchestration
- Production error handling

## Persona Coverage

| Scenario | End User | Developer | Business Op | Compliance | Regulator |
|----------|:--------:|:---------:|:-----------:|:----------:|:---------:|
| Getting Started | ✓ | ✓ | | | |
| Healthcare | ✓ | ✓ | ✓ | ✓ | ✓ |
| Financial | ✓ | ✓ | ✓ | ✓ | ✓ |
| Marketing | ✓ | ✓ | ✓ | ✓ | |
| Research | ✓ | ✓ | ✓ | ✓ | |
| IoT/Supply | | ✓ | ✓ | | |
| Advanced | | ✓ | ✓ | | |
| Compliance | | ✓ | | ✓ | ✓ |
| Integration | | ✓ | | | |

## Contract Mapping

Each example uses one or more of these contracts:

| Contract | Purpose | Used In |
|----------|---------|---------|
| `ConsentReceipt` | Basic consent management | All scenarios |
| `DataProvenance` | Data ownership & lineage | Healthcare, Finance, IoT |
| `IntegratedConsentProvenanceSystem` | Consent-verified data ops | Healthcare, Finance, Research |
| `KantaraConsentReceipt` | Full Kantara compliance | Compliance, Finance |
| `ConsentAuditLog` | Immutable audit trail | Compliance, Healthcare |
| `DataAccessControl` | Granular access levels | Advanced, Healthcare |
| `ConsentProxy` | Delegated consent | Advanced, Healthcare |
| `DataDeletion` | Right to erasure | Healthcare, Finance |
| `PurposeRegistry` | Purpose definitions | Compliance |

## Prerequisites

1. **Node.js**: v18.0.0 or higher
2. **Local Hardhat Node**: Running on port 8545

```bash
# Terminal 1: Start local node
npm run node

# Terminal 2: Run examples
npx hardhat run examples/<path-to-example>.ts --network localhost
```

## Example Structure

Each example follows a consistent structure:

```typescript
/**
 * Example: [Title]
 * Scenario: [Industry/Use Case]
 * Persona: [Target Audience]
 *
 * This example demonstrates:
 * - [Key concept 1]
 * - [Key concept 2]
 */

async function main() {
  // === SETUP ===
  // Deploy contracts and get signers

  // === SCENARIO ===
  // Step-by-step workflow with comments

  // === VERIFICATION ===
  // Verify expected state

  // === SUMMARY ===
  // Display results
}

main().catch(console.error);
```

## Common Utilities

The `common/` directory provides shared utilities:

- **`setup.ts`**: Contract deployment functions
- **`constants.ts`**: Industry-specific constants and data
- **`utils.ts`**: Logging, hashing, and helper functions

```typescript
import { deployCoreContracts, getNamedSigners } from "../common/setup";
import { HEALTHCARE, TIME } from "../common/constants";
import { logStep, logSuccess, hashData } from "../common/utils";
```

## Running Examples

### Single Example
```bash
npx hardhat run examples/01-getting-started/01-basic-consent.ts --network localhost
```

### With Custom Network
```bash
npx hardhat run examples/02-healthcare/01-patient-consent.ts --network sepolia
```

### Using npm Scripts
```bash
npm run example:basic-consent
npm run example:healthcare
npm run example:compliance
```

## Customization

Each example is designed to be modified for your specific use case:

1. **Change purposes**: Update purpose strings to match your domain
2. **Adjust expiry times**: Modify durations in the `TIME` constants
3. **Add data types**: Extend constants in `common/constants.ts`
4. **Custom workflows**: Combine steps from multiple examples

## Troubleshooting

### "Contract not deployed"
Ensure the local Hardhat node is running:
```bash
npm run node
```

### "Insufficient funds"
The examples use test accounts with pre-funded ETH. Make sure you're using `--network localhost`.

### "Nonce too high"
Reset the Hardhat node:
```bash
# Stop and restart the node
npm run node
```

## Contributing

To add a new example:

1. Create a new file in the appropriate scenario folder
2. Follow the example structure template
3. Add industry-specific constants to `common/constants.ts`
4. Update the scenario's README.md
5. Add an npm script to `package.json`

## License

MIT License - see [LICENSE](../LICENSE) for details.
