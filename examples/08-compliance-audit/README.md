# Compliance & Audit Examples

This section demonstrates how to use the consent-based data provenance system for regulatory compliance, audit evidence generation, and forensic investigation.

## Overview

Modern data protection regulations (GDPR, HIPAA, CCPA, SOX) require organizations to demonstrate:
- **Lawful basis** for processing (consent evidence)
- **Accountability** through documented processes
- **Transparency** in data handling practices
- **Audit trails** for regulatory inspection
- **Breach investigation** capabilities

These examples show how the smart contract system provides cryptographic proof of compliance.

## Regulatory Framework Coverage

| Regulation | Key Requirements | Examples |
|------------|------------------|----------|
| **GDPR** | Consent, Rights, Accountability | 01, 02, 03 |
| **HIPAA** | Access logs, Minimum necessary | 03, 05 |
| **CCPA** | Do not sell, Access requests | 01, 03 |
| **SOX** | Financial data integrity | 04 |
| **Kantara** | Consent receipt specification | 02 |

## Examples

### 01 - GDPR Compliance
**File:** `01-gdpr-compliance.ts`

Demonstrates GDPR Articles 6-7 (Lawful Basis), Article 17 (Right to Erasure), Article 20 (Data Portability), and Article 30 (Records of Processing).

**Key Features:**
- Article 6: Lawful basis tracking per purpose
- Article 7: Granular, freely-given consent
- Article 13-14: Transparent information provision
- Article 17: Right to erasure with verification
- Article 30: Processing activity records

### 02 - Kantara Consent Receipts
**File:** `02-kantara-receipts.ts`

Full implementation of the Kantara Initiative Consent Receipt Specification, providing standardized, machine-readable consent records.

**Key Features:**
- All 30 consent types supported
- 70+ purpose categories
- Third-party disclosure tracking
- Policy URL references
- Expiration management

### 03 - Audit Log Queries
**File:** `03-audit-log-queries.ts`

Shows how to query the ConsentAuditLog for compliance evidence, supporting various query patterns needed for regulatory inspection.

**Key Features:**
- Query by subject (data subject requests)
- Query by actor (who did what)
- Query by time range (period audits)
- Query by action type (specific events)
- Export-ready audit reports

### 04 - Regulatory Report Generation
**File:** `04-regulatory-report.ts`

Generates compliance reports suitable for regulatory submission, combining consent status, data inventory, and audit evidence.

**Key Features:**
- Consent statistics dashboard
- Data processing inventory
- Access pattern analysis
- Compliance score calculation
- Executive summary generation

### 05 - Breach Investigation
**File:** `05-breach-investigation.ts`

Forensic analysis capabilities for investigating potential data breaches, identifying scope, and generating incident reports.

**Key Features:**
- Affected data identification
- Access timeline reconstruction
- Unauthorized access detection
- Impact assessment
- Incident report generation

## Running Examples

```bash
# Start local blockchain
docker-compose up -d

# Run individual examples
npx hardhat run examples/08-compliance-audit/01-gdpr-compliance.ts --network localhost
npx hardhat run examples/08-compliance-audit/02-kantara-receipts.ts --network localhost
npx hardhat run examples/08-compliance-audit/03-audit-log-queries.ts --network localhost
npx hardhat run examples/08-compliance-audit/04-regulatory-report.ts --network localhost
npx hardhat run examples/08-compliance-audit/05-breach-investigation.ts --network localhost
```

## Compliance Checklist

### GDPR Compliance Evidence

| Article | Requirement | Contract Evidence |
|---------|-------------|-------------------|
| Art. 6 | Lawful basis | Consent receipt with purpose |
| Art. 7 | Consent conditions | Granular, withdrawable consent |
| Art. 12 | Transparent info | Policy URL in receipt |
| Art. 13-14 | Information provision | Receipt metadata |
| Art. 15 | Access right | getUserConsents() |
| Art. 16 | Rectification | Data transformation logs |
| Art. 17 | Erasure | Deletion certificate |
| Art. 20 | Portability | Export functions |
| Art. 30 | Processing records | Audit log queries |
| Art. 33-34 | Breach notification | Investigation reports |

### Audit Trail Requirements

1. **Who** - Actor address recorded in every event
2. **What** - Action type enumeration
3. **When** - Block timestamp (immutable)
4. **Where** - Contract address and data hash
5. **Why** - Purpose recorded with consent

## Best Practices

### For Compliance Officers
1. Schedule regular audit log exports
2. Monitor consent expiration dates
3. Review access patterns quarterly
4. Test breach investigation procedures
5. Maintain compliance documentation

### For Developers
1. Always record audit entries for data access
2. Include purpose with every consent check
3. Implement proper error handling for compliance queries
4. Use batch operations for efficiency
5. Consider gas costs in reporting frequency

### For Regulators
1. Verify consent timestamps against claims
2. Check audit log completeness
3. Validate deletion certificates
4. Review access patterns for anomalies
5. Confirm purpose limitation compliance

## Integration with External Systems

```
┌─────────────────────────────────────────────────────────────┐
│                    Compliance Dashboard                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Consent      │    │ Data         │    │ Audit        │  │
│  │ Analytics    │    │ Inventory    │    │ Reports      │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                   │           │
│         └─────────────┬─────┴───────────────────┘           │
│                       │                                      │
│              ┌────────▼────────┐                            │
│              │  API Gateway    │                            │
│              └────────┬────────┘                            │
│                       │                                      │
└───────────────────────┼──────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Consent      │ │ Data         │ │ Audit        │
│ Receipt      │ │ Provenance   │ │ Log          │
└──────────────┘ └──────────────┘ └──────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
                ┌───────▼───────┐
                │  Blockchain   │
                └───────────────┘
```

## Compliance Report Template

Generated reports include:

```
═══════════════════════════════════════════════════════════════
                    COMPLIANCE REPORT
═══════════════════════════════════════════════════════════════

Report ID: [hash]
Generated: [timestamp]
Period: [start] to [end]

CONSENT STATISTICS
─────────────────────────────────────────────────────────────
  Total Consents: [count]
  Active: [count] | Revoked: [count] | Expired: [count]

DATA PROCESSING
─────────────────────────────────────────────────────────────
  Data Records: [count]
  Transformations: [count]
  Deletions: [count]

AUDIT SUMMARY
─────────────────────────────────────────────────────────────
  Total Events: [count]
  By Type: Consent Given [n], Revoked [n], Data Access [n]
  Unique Actors: [count]

COMPLIANCE STATUS
─────────────────────────────────────────────────────────────
  ✓ Consent records complete
  ✓ Audit trail intact
  ✓ Deletion certificates valid

═══════════════════════════════════════════════════════════════
```

## Next Steps

After exploring these compliance examples, see:
- [Integration Patterns](../09-integration-patterns/) - Backend service integration
- [Advanced Patterns](../07-advanced-patterns/) - Production-ready techniques
