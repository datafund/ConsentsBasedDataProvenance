# 01 - Getting Started

This section introduces the basic concepts of consent management using the ConsentReceipt contract.

## Target Audience

- **End Users**: Understand how consent works from a user perspective
- **Developers**: Learn the fundamental API patterns

## Examples

### 01 - Basic Consent
The simplest consent flow: give consent for a purpose and verify it.

```bash
npx hardhat run examples/01-getting-started/01-basic-consent.ts --network localhost
```

**Demonstrates:**
- Deploying ConsentReceipt contract
- Giving consent for a purpose
- Checking consent status
- Viewing consent details

### 02 - Consent with Expiry
Time-limited consent that automatically becomes invalid after expiration.

```bash
npx hardhat run examples/01-getting-started/02-consent-with-expiry.ts --network localhost
```

**Demonstrates:**
- Setting expiration time on consent
- Verifying consent validity over time
- Understanding blockchain timestamps

### 03 - Revoke Consent
How users can revoke their consent at any time.

```bash
npx hardhat run examples/01-getting-started/03-revoke-consent.ts --network localhost
```

**Demonstrates:**
- Revoking consent by index
- Consent status after revocation
- Maintaining consent history

### 04 - Integrated System
The main orchestrator that ties consent and data provenance together.

```bash
npx hardhat run examples/01-getting-started/04-integrated-system.ts --network localhost
```

**Demonstrates:**
- IntegratedConsentProvenanceSystem contract
- Consent-verified data operations
- Automatic consent checking before data access
- Data restriction on consent revocation
- Complete audit trail with consent linkage

## Key Concepts

### Consent Structure

Each consent record contains:

```solidity
struct Consent {
    address user;        // Who gave consent
    string purpose;      // What they consented to
    uint256 timestamp;   // When consent was given
    uint256 expiryTime;  // When it expires (0 = never)
    bool isValid;        // Current validity status
}
```

### Consent Status

A consent is considered valid when:
1. `isValid` is `true` (not revoked)
2. `expiryTime` is `0` OR `expiryTime > block.timestamp`

### Purpose Strings

Purposes are free-form strings. Common patterns:
- `"email_marketing"` - Marketing communications
- `"analytics"` - Website/app analytics
- `"data_sharing"` - Third-party data sharing
- `"medical_treatment"` - Healthcare consent

## Contract API Quick Reference

```typescript
// Give consent (no expiry)
await consentReceipt.connect(user)["giveConsent(string)"]("purpose");

// Give consent (with expiry)
await consentReceipt.connect(user)["giveConsent(string,uint256)"]("purpose", expiryTime);

// Check if consent is valid
const hasConsent = await consentReceipt.getConsentStatus(userAddress, "purpose");

// Revoke consent by index
await consentReceipt.connect(user).revokeConsent(consentIndex);

// Get all user's consents
const consents = await consentReceipt.getUserConsents(userAddress);

// Get consent count
const count = await consentReceipt.getUserConsentsCount(userAddress);
```

## Next Steps

After completing these examples, explore:
- [Healthcare](../02-healthcare/) - Multi-purpose consent with data provenance
- [Marketing](../04-marketing/) - Cookie consent and preference management
- [Advanced Patterns](../07-advanced-patterns/) - Batch operations and meta-transactions
