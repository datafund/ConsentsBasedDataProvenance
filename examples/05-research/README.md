# 05 - Research

This section demonstrates research data management with consent and provenance tracking, supporting academic institutions and clinical research organizations.

## Target Audience

- **End Users (Participants)**: Understand research consent rights
- **Developers**: Learn research data integration patterns
- **Researchers**: Implement consent-based data collection
- **IRB/Ethics Boards**: Audit consent compliance
- **Research Institutions**: Multi-site collaboration

## Regulatory Context

### Key Regulations
- **Common Rule (45 CFR 46)**: US federal research regulations
- **GDPR**: EU data protection for research
- **HIPAA**: Healthcare research requirements
- **ICH-GCP**: International clinical trial standards
- **Belmont Report**: Ethical principles

### How This System Helps
- Documented informed consent with timestamps
- Data anonymization tracking
- Multi-institution data sharing with consent
- Participant withdrawal support
- Complete audit trail for IRB review

## Examples

### 01 - Study Enrollment
Participant consent for research study.

```bash
npx hardhat run examples/05-research/01-study-enrollment.ts --network localhost
```

**Scenario:**
```
Participant enrolls in study:
├── Informed consent process
├── Consent for specific study procedures
├── Optional consent for future use
└── Right to withdraw at any time
```

**Demonstrates:**
- Multi-purpose research consent
- Study-specific consent tracking
- Withdrawal workflow

### 02 - Data Anonymization
Track data de-identification for research.

```bash
npx hardhat run examples/05-research/02-data-anonymization.ts --network localhost
```

**Scenario:**
```
Data preparation for research:
├── Identifiable data collected
├── De-identification process
├── Transformation recorded
└── Anonymized data for analysis
```

**Demonstrates:**
- Data transformation tracking
- Anonymization provenance
- Linked data lineage

### 03 - Multi-Institution
Cross-organization research data sharing.

```bash
npx hardhat run examples/05-research/03-multi-institution.ts --network localhost
```

**Scenario:**
```
Multi-site clinical trial:
├── Participant consent at Site A
├── Data shared with coordinating center
├── Analysis by collaborating institution
└── All access tracked
```

**Demonstrates:**
- Cross-institution consent
- Data sharing agreements
- Multi-party access logging

### 04 - Publication Consent
Consent for research findings publication.

```bash
npx hardhat run examples/05-research/04-publication-consent.ts --network localhost
```

**Scenario:**
```
Publishing research results:
├── Data analysis complete
├── Request consent for publication
├── Consent for case study publication
└── Acknowledgment in publication
```

**Demonstrates:**
- Secondary use consent
- Publication authorization
- Consent verification before publication

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Research Data Workflow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────┐     ┌───────────────┐     ┌─────────────────┐   │
│  │Participant │────▶│Informed Consent│────▶│ ConsentReceipt  │   │
│  └────────────┘     └───────────────┘     └─────────────────┘   │
│                            │                       │             │
│                            ▼                       ▼             │
│  ┌────────────┐     ┌───────────────┐     ┌─────────────────┐   │
│  │ Researcher │────▶│ Collect Data  │────▶│ DataProvenance  │   │
│  └────────────┘     └───────────────┘     └─────────────────┘   │
│                            │                       │             │
│                            ▼                       ▼             │
│  ┌────────────┐     ┌───────────────┐     ┌─────────────────┐   │
│  │   Lab      │────▶│ De-identify   │────▶│ Transformation  │   │
│  └────────────┘     └───────────────┘     │ Tracking        │   │
│                            │              └─────────────────┘   │
│                            ▼                       │             │
│  ┌────────────┐     ┌───────────────┐     ┌─────────────────┐   │
│  │Collaborator│────▶│ Access Data   │────▶│ AuditLog        │   │
│  └────────────┘     └───────────────┘     └─────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Contract Mapping

| Function | Contract | Purpose |
|----------|----------|---------|
| Study consent | ConsentReceipt | Informed consent records |
| Data collection | IntegratedSystem | Consent-verified registration |
| Anonymization | DataProvenance | Transformation tracking |
| Sharing | DataProvenance | Access logging |
| Audit | ConsentAuditLog | IRB compliance |

## Ethical Compliance Mapping

| Requirement | System Feature |
|-------------|----------------|
| Informed Consent | KantaraConsentReceipt with full disclosure |
| Voluntary Participation | Easy withdrawal via revokeConsent |
| Minimization | Purpose-specific consent |
| Transparency | getUserConsents for participant access |
| Accountability | Complete audit trail |

## Consent Types for Research

| Consent Type | Description | Duration |
|--------------|-------------|----------|
| Study Participation | Core research activities | Study duration |
| Data Collection | Specific data types | As specified |
| Sample Storage | Biospecimen banking | Long-term |
| Future Research | Broad consent | Indefinite |
| Publication | Case study/results | One-time |

## Next Steps

After completing these examples, explore:
- [Healthcare](../02-healthcare/) - Clinical research patterns
- [Compliance & Audit](../08-compliance-audit/) - IRB audit support
- [Advanced Patterns](../07-advanced-patterns/) - Delegated consent (guardians)
