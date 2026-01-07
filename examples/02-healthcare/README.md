# 02 - Healthcare

This section demonstrates HIPAA-compliant healthcare data management using the consent-based data provenance system.

## Target Audience

- **End Users (Patients)**: Understand how consent protects medical data
- **Developers**: Learn healthcare integration patterns
- **Business Operators**: Hospital IT and compliance implementation
- **Compliance Officers**: HIPAA compliance documentation
- **Regulators**: Audit and verification capabilities

## Regulatory Context

### HIPAA Requirements
- **Authorization**: Patients must authorize disclosure of PHI
- **Minimum Necessary**: Only disclose minimum required information
- **Accounting of Disclosures**: Track all PHI access for 6 years
- **Right to Access**: Patients can access their records
- **Right to Amend**: Patients can request corrections

### How This System Helps
- On-chain consent receipts provide immutable authorization records
- Data provenance tracks all access and transformations
- Audit logs enable disclosure accounting
- Status management supports right to restriction

## Examples

### 01 - Patient Consent
Multi-purpose consent for healthcare services.

```bash
npx hardhat run examples/02-healthcare/01-patient-consent.ts --network localhost
```

**Scenario:**
```
Patient (Alice) arrives at hospital and gives consent for:
├── Treatment (permanent) - Required for care
├── Insurance billing (2 years) - Claims processing
└── Research (1 year, opt-in) - Clinical research participation
```

**Demonstrates:**
- Multi-purpose consent with different expiration periods
- Consent verification before data operations
- Purpose-specific consent tracking

### 02 - Medical Records
Register and track medical data with consent verification.

```bash
npx hardhat run examples/02-healthcare/02-medical-records.ts --network localhost
```

**Scenario:**
```
Hospital workflow:
1. Patient gives treatment consent
2. Doctor registers diagnosis data (requires consent)
3. Lab registers test results (requires consent)
4. All data linked to patient with provenance
```

**Demonstrates:**
- IntegratedConsentProvenanceSystem for consent-verified registration
- Data provenance tracking
- Multiple data types per patient

### 03 - Research Sharing
Consent for research data use with anonymization tracking.

```bash
npx hardhat run examples/02-healthcare/03-research-sharing.ts --network localhost
```

**Scenario:**
```
Research data flow:
Patient Data → Anonymization → Research Dataset → Publication

1. Patient opts into research
2. Data anonymized (transformation recorded)
3. Research institution accesses anonymized data
4. Patient revokes research consent
5. Data access blocked, but history preserved
```

**Demonstrates:**
- Data transformation tracking (anonymization)
- Cross-organization data sharing
- Consent revocation cascade to data

### 04 - HIPAA Audit Trail
Generate compliance-ready audit logs.

```bash
npx hardhat run examples/02-healthcare/04-hipaa-audit-trail.ts --network localhost
```

**Scenario:**
```
Compliance audit request:
├── Query all access to patient records
├── Generate disclosure accounting report
├── Verify consent was valid at time of access
└── Export evidence for regulators
```

**Demonstrates:**
- ConsentAuditLog for comprehensive logging
- Query by patient (subject) or provider (actor)
- Time-bounded audit queries
- Evidence generation for compliance

### 05 - Right to Deletion
GDPR/HIPAA-compliant data deletion with proof.

```bash
npx hardhat run examples/02-healthcare/05-right-to-deletion.ts --network localhost
```

**Scenario:**
```
Patient exercises deletion rights:
1. Patient requests data deletion
2. System generates deletion proof
3. Data marked as deleted (inaccessible)
4. Proof available for compliance verification
5. Audit trail maintained
```

**Demonstrates:**
- DataDeletion contract for erasure requests
- Cryptographic deletion proofs
- Maintaining audit trail while deleting data
- Verification of deletion for compliance

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Patient Journey                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────┐     ┌─────────────┐     ┌──────────────┐           │
│  │ Patient │────▶│ Give Consent │────▶│ ConsentReceipt│           │
│  └─────────┘     └─────────────┘     └──────────────┘           │
│                         │                    │                    │
│                         ▼                    ▼                    │
│  ┌─────────┐     ┌─────────────┐     ┌──────────────┐           │
│  │ Doctor  │────▶│Register Data │────▶│IntegratedSys │           │
│  └─────────┘     └─────────────┘     └──────────────┘           │
│                         │                    │                    │
│                         ▼                    ▼                    │
│  ┌─────────┐     ┌─────────────┐     ┌──────────────┐           │
│  │   Lab   │────▶│ Add Results  │────▶│DataProvenance│           │
│  └─────────┘     └─────────────┘     └──────────────┘           │
│                         │                    │                    │
│                         ▼                    ▼                    │
│  ┌─────────┐     ┌─────────────┐     ┌──────────────┐           │
│  │Researcher────▶│Access for    │────▶│ AuditLog    │           │
│  └─────────┘     │Research      │     └──────────────┘           │
│                  └─────────────┘                                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Contract Mapping

| Function | Contract | Purpose |
|----------|----------|---------|
| Patient consent | ConsentReceipt | Store authorization records |
| Data registration | IntegratedSystem | Consent-verified data entry |
| Provenance tracking | DataProvenance | Track data lineage |
| Access logging | ConsentAuditLog | HIPAA disclosure accounting |
| Deletion requests | DataDeletion | Right to erasure |
| Access control | DataAccessControl | Provider access levels |

## HIPAA Compliance Mapping

| HIPAA Requirement | System Feature |
|-------------------|----------------|
| Authorization (45 CFR 164.508) | ConsentReceipt with purpose tracking |
| Minimum Necessary (164.502) | Purpose-specific consent verification |
| Accounting of Disclosures (164.528) | ConsentAuditLog queries |
| Right to Access (164.524) | getUserConsents, getDataRecord |
| Right to Amend | Data transformation tracking |
| Breach Notification (164.404) | AuditLog forensic queries |

## Next Steps

After completing these examples, explore:
- [Compliance & Audit](../08-compliance-audit/) - Full regulatory compliance patterns
- [Advanced Patterns](../07-advanced-patterns/) - Delegated consent for guardians
- [Integration Patterns](../09-integration-patterns/) - EHR system integration
