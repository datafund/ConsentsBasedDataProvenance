# 04 - Marketing

This section demonstrates GDPR/CCPA-compliant marketing consent management using the consent-based data provenance system.

## Target Audience

- **End Users (Consumers)**: Understand marketing consent options
- **Developers**: Learn marketing consent integration patterns
- **Business Operators**: Marketing team consent management
- **Compliance Officers**: Privacy regulation compliance
- **Legal Teams**: Consent documentation for audits

## Regulatory Context

### Key Regulations
- **GDPR (EU)**: Explicit opt-in consent required for marketing
- **CCPA (California)**: Opt-out rights for personal data sale
- **CAN-SPAM**: Commercial email requirements
- **ePrivacy Directive**: Cookie consent requirements
- **TCPA**: Telephone Consumer Protection Act

### How This System Helps
- Granular consent per marketing channel
- Explicit opt-in with timestamp proof
- Easy opt-out with consent revocation
- Preference center for user control
- Complete audit trail for compliance

## Examples

### 01 - Email Consent
Email marketing opt-in with GDPR compliance.

```bash
npx hardhat run examples/04-marketing/01-email-consent.ts --network localhost
```

**Scenario:**
```
User subscribes to newsletter:
├── Explicit opt-in required
├── Purpose clearly stated
├── Easy unsubscribe option
└── Consent timestamp recorded
```

**Demonstrates:**
- Double opt-in consent pattern
- Consent with expiration
- Unsubscribe workflow

### 02 - Cookie Consent
Website tracking consent under ePrivacy Directive.

```bash
npx hardhat run examples/04-marketing/02-cookie-consent.ts --network localhost
```

**Scenario:**
```
User visits website:
├── Essential cookies (no consent needed)
├── Analytics cookies (opt-in)
├── Marketing cookies (opt-in)
└── Preferences stored and tracked
```

**Demonstrates:**
- Multi-category cookie consent
- Granular per-category control
- Consent banner workflow

### 03 - Personalization
Ad personalization consent management.

```bash
npx hardhat run examples/04-marketing/03-personalization.ts --network localhost
```

**Scenario:**
```
User consents to personalization:
├── Interest-based advertising
├── Cross-site tracking
├── Data for personalization
└── Opt-out at any time
```

**Demonstrates:**
- Personalization data consent
- Third-party ad network sharing
- User preference management

### 04 - Third-Party Sharing
Partner data sharing consent under CCPA.

```bash
npx hardhat run examples/04-marketing/04-third-party-sharing.ts --network localhost
```

**Scenario:**
```
Data sharing with partners:
├── User consents to partner sharing
├── Specific partners identified
├── Data access tracked
└── "Do Not Sell" option
```

**Demonstrates:**
- Third-party disclosure consent
- Partner access logging
- CCPA "Do Not Sell" compliance

### 05 - Preference Center
Comprehensive user preference management.

```bash
npx hardhat run examples/04-marketing/05-preference-center.ts --network localhost
```

**Scenario:**
```
User manages preferences:
├── View all active consents
├── Modify specific consents
├── Bulk opt-out option
└── Download consent history
```

**Demonstrates:**
- Complete preference management
- Consent modification
- Batch operations

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Marketing Consent Workflow                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────┐     ┌───────────────┐     ┌─────────────────┐     │
│  │   User   │────▶│ Consent Form  │────▶│ ConsentReceipt  │     │
│  └──────────┘     └───────────────┘     └─────────────────┘     │
│                          │                       │               │
│                          ▼                       ▼               │
│  ┌──────────┐     ┌───────────────┐     ┌─────────────────┐     │
│  │ Marketing│────▶│ Verify Consent│────▶│ Status Check    │     │
│  │ Platform │     └───────────────┘     └─────────────────┘     │
│  └──────────┘            │                       │               │
│                          ▼                       ▼               │
│  ┌──────────┐     ┌───────────────┐     ┌─────────────────┐     │
│  │ Partners │────▶│ Access Check  │────▶│ AuditLog        │     │
│  └──────────┘     └───────────────┘     └─────────────────┘     │
│                          │                       │               │
│                          ▼                       ▼               │
│  ┌──────────┐     ┌───────────────┐     ┌─────────────────┐     │
│  │   User   │────▶│ Preference    │────▶│ Update/Revoke   │     │
│  └──────────┘     │ Center        │     └─────────────────┘     │
│                   └───────────────┘                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Contract Mapping

| Function | Contract | Purpose |
|----------|----------|---------|
| Email consent | ConsentReceipt | Newsletter subscription |
| Cookie preferences | ConsentReceipt | Multi-category tracking |
| Personalization | KantaraConsentReceipt | Detailed consent records |
| Partner sharing | IntegratedSystem | Third-party access control |
| Preference center | ConsentReceipt | User consent management |

## Regulatory Compliance Mapping

| Regulation | System Feature |
|------------|----------------|
| GDPR Article 7 | Explicit opt-in with timestamp |
| GDPR Article 21 | Right to object (revocation) |
| ePrivacy Directive | Cookie category consent |
| CCPA 1798.120 | "Do Not Sell" option |
| CAN-SPAM | Unsubscribe tracking |

## Consent Categories

| Category | Description | Default |
|----------|-------------|---------|
| Essential | Required for service | No consent needed |
| Analytics | Usage tracking | Opt-in required |
| Marketing | Email/SMS marketing | Opt-in required |
| Personalization | Ad targeting | Opt-in required |
| Third-Party | Partner sharing | Opt-in required |

## Next Steps

After completing these examples, explore:
- [Compliance & Audit](../08-compliance-audit/) - GDPR compliance demonstrations
- [Advanced Patterns](../07-advanced-patterns/) - Batch consent operations
- [Integration Patterns](../09-integration-patterns/) - Event-driven consent updates
