# 07 - Advanced Patterns

This section demonstrates advanced usage patterns for the consent-based data provenance system, including meta-transactions, delegated consent, batch operations, and role-based access control.

## Target Audience

- **Developers**: Implement production-ready patterns
- **Architects**: Design scalable consent systems
- **Business Operators**: Understand advanced capabilities

## Examples

### 01 - Meta-Transactions
Gasless consent operations using signatures.

```bash
npx hardhat run examples/07-advanced-patterns/01-meta-transactions.ts --network localhost
```

**Scenario:**
```
Gasless consent flow:
├── User signs consent message off-chain
├── Relayer submits transaction
├── User doesn't need ETH for gas
└── Consent recorded on-chain
```

**Demonstrates:**
- EIP-712 typed data signing
- Signature-based consent
- Relayer pattern for gas abstraction

### 02 - Delegated Consent
Power of attorney and guardianship patterns.

```bash
npx hardhat run examples/07-advanced-patterns/02-delegated-consent.ts --network localhost
```

**Scenario:**
```
Healthcare delegation:
├── Patient authorizes guardian
├── Guardian consents on patient's behalf
├── Consent linked to patient
└── Delegation can be revoked
```

**Demonstrates:**
- ConsentProxy for delegation
- Guardian/POA consent
- Delegation management

### 03 - Batch Operations
Bulk consent and data operations.

```bash
npx hardhat run examples/07-advanced-patterns/03-batch-operations.ts --network localhost
```

**Scenario:**
```
Bulk consent management:
├── Give multiple consents at once
├── Revoke multiple consents
├── Validate multiple receipts
└── Register multiple data records
```

**Demonstrates:**
- KantaraConsentReceipt batch functions
- Gas-efficient bulk operations
- Transaction batching patterns

### 04 - RBAC Administration
Role-based access control for consent systems.

```bash
npx hardhat run examples/07-advanced-patterns/04-rbac-administration.ts --network localhost
```

**Scenario:**
```
Organization roles:
├── Admin manages roles
├── Auditors can query
├── Operators can record
└── Users manage own data
```

**Demonstrates:**
- ConsentAuditLog admin functions
- Authorized recorder management
- Role-based permissions

### 05 - Access Level Management
Granular data access control.

```bash
npx hardhat run examples/07-advanced-patterns/05-access-level-management.ts --network localhost
```

**Scenario:**
```
Access levels:
├── Read: View data only
├── Transform: Can process data
├── Full: Complete control
└── Time-bounded access
```

**Demonstrates:**
- DataAccessControl contract
- Tiered access levels
- Access expiration

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Advanced Patterns                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  META-TRANSACTIONS                           │ │
│  │    User ──▶ Sign Message ──▶ Relayer ──▶ Blockchain         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  DELEGATED CONSENT                           │ │
│  │    Principal ──▶ Authorize ──▶ Delegate ──▶ Act on Behalf   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  BATCH OPERATIONS                            │ │
│  │    Multiple Items ──▶ Single Transaction ──▶ Atomic Result  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  ACCESS CONTROL                              │ │
│  │    Owner ──▶ Grant ──▶ Grantee ──▶ Time-bounded Access      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Contract Mapping

| Pattern | Contract | Key Functions |
|---------|----------|---------------|
| Meta-transactions | (Off-chain signing) | EIP-712 signatures |
| Delegated consent | ConsentProxy | authorizeDelegate, delegatedConsent |
| Batch operations | KantaraConsentReceipt | batchRevokeConsent, batchIsConsentValid |
| RBAC | ConsentAuditLog | setAuthorizedRecorder |
| Access levels | DataAccessControl | grantAccess, checkAccess |

## Access Level Hierarchy

| Level | Value | Capabilities |
|-------|-------|--------------|
| None | 0 | No access |
| Read | 1 | View data only |
| Transform | 2 | Read + process/transform |
| Full | 3 | Complete control |

## Security Considerations

- Delegated consent requires explicit authorization
- Meta-transaction signatures should include nonces
- Batch operations have size limits for gas
- Access grants should have reasonable expiration
- RBAC admin functions require careful key management

## Next Steps

After completing these examples, explore:
- [Compliance & Audit](../08-compliance-audit/) - Regulatory patterns
- [Integration Patterns](../09-integration-patterns/) - System integration
