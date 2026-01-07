# Integration Patterns

This section demonstrates production-ready patterns for integrating the consent-based data provenance system with real-world applications and backend services.

## Overview

Integrating smart contracts into production systems requires careful consideration of:
- **Event handling** for real-time updates
- **Backend architecture** for scalable applications
- **Multi-contract orchestration** for complex workflows
- **Error handling** for reliability and user experience

These examples provide patterns that can be adapted for any production deployment.

## Examples

### 01 - Event-Driven Architecture
**File:** `01-event-driven.ts`

Shows how to listen to contract events for real-time updates, enabling reactive applications that respond to consent changes and data operations.

**Key Features:**
- Event listener setup
- Event filtering and parsing
- Webhook integration patterns
- Real-time notification system

### 02 - Backend Service Integration
**File:** `02-backend-service.ts`

Demonstrates patterns for integrating smart contracts into a backend service, including connection management, transaction handling, and caching strategies.

**Key Features:**
- Provider and signer management
- Transaction queue patterns
- Caching consent status
- API endpoint design

### 03 - Multi-Contract Workflow
**File:** `03-multi-contract-workflow.ts`

Shows how to orchestrate operations across multiple contracts for complex business workflows, maintaining consistency and handling failures.

**Key Features:**
- Contract coordination
- Atomic-like operations
- Rollback patterns
- State verification

### 04 - Error Handling
**File:** `04-error-handling.ts`

Comprehensive error handling patterns for production reliability, including retry strategies, graceful degradation, and user-friendly error messages.

**Key Features:**
- Common error types
- Retry with exponential backoff
- Graceful degradation
- User-friendly error mapping

## Running Examples

```bash
# Start local blockchain
docker-compose up -d

# Run individual examples
npx hardhat run examples/09-integration-patterns/01-event-driven.ts --network localhost
npx hardhat run examples/09-integration-patterns/02-backend-service.ts --network localhost
npx hardhat run examples/09-integration-patterns/03-multi-contract-workflow.ts --network localhost
npx hardhat run examples/09-integration-patterns/04-error-handling.ts --network localhost
```

## Architecture Patterns

### Event-Driven Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Event-Driven Architecture                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐      Events      ┌─────────────┐          │
│  │  Smart      │ ───────────────► │  Event      │          │
│  │  Contract   │                  │  Listener   │          │
│  └─────────────┘                  └──────┬──────┘          │
│                                          │                  │
│                                          ▼                  │
│                                   ┌─────────────┐          │
│                                   │  Message    │          │
│                                   │  Queue      │          │
│                                   └──────┬──────┘          │
│                                          │                  │
│         ┌────────────────────────────────┼───────┐         │
│         ▼                                ▼       ▼         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Database   │  │  Email      │  │  Analytics  │        │
│  │  Sync       │  │  Service    │  │  Pipeline   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Backend Service Integration

```
┌─────────────────────────────────────────────────────────────┐
│                    Backend Service Pattern                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐                                            │
│  │   Client    │                                            │
│  │   (API)     │                                            │
│  └──────┬──────┘                                            │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Backend Service                       │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐       │   │
│  │  │  REST     │  │  Consent  │  │  Cache    │       │   │
│  │  │  API      │  │  Service  │  │  Layer    │       │   │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘       │   │
│  │        │              │              │              │   │
│  │        └──────────────┼──────────────┘              │   │
│  │                       │                              │   │
│  │                ┌──────▼──────┐                      │   │
│  │                │  Blockchain │                      │   │
│  │                │  Connector  │                      │   │
│  │                └──────┬──────┘                      │   │
│  └───────────────────────┼───────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│                   ┌─────────────┐                          │
│                   │  Ethereum   │                          │
│                   │  Network    │                          │
│                   └─────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Contract Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                Multi-Contract Orchestration                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐                                            │
│  │ Orchestrator│                                            │
│  └──────┬──────┘                                            │
│         │                                                    │
│    ┌────┴────┬────────────┬────────────┐                   │
│    │         │            │            │                    │
│    ▼         ▼            ▼            ▼                    │
│ ┌──────┐ ┌──────┐    ┌──────┐    ┌──────┐                 │
│ │Step 1│ │Step 2│    │Step 3│    │Step 4│                 │
│ │Verify│→│Consent│ → │Register│ → │Log   │                 │
│ │Perms │ │Check │    │Data   │    │Audit │                 │
│ └──────┘ └──────┘    └──────┘    └──────┘                 │
│    │         │            │            │                    │
│    ▼         ▼            ▼            ▼                    │
│ ┌──────┐ ┌──────┐    ┌──────┐    ┌──────┐                 │
│ │Access│ │Consent│   │Data  │    │Audit │                 │
│ │Control│ │Receipt│   │Prov. │    │Log   │                 │
│ └──────┘ └──────┘    └──────┘    └──────┘                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Best Practices

### Connection Management

```typescript
// Singleton pattern for provider
class BlockchainConnector {
  private static instance: BlockchainConnector;
  private provider: ethers.Provider;

  static getInstance() {
    if (!BlockchainConnector.instance) {
      BlockchainConnector.instance = new BlockchainConnector();
    }
    return BlockchainConnector.instance;
  }
}
```

### Event Subscription

```typescript
// Robust event listener with reconnection
contract.on("ConsentGiven", async (receiptId, subject, purposes) => {
  try {
    await processConsentEvent(receiptId, subject, purposes);
  } catch (error) {
    await queueForRetry(receiptId);
    alertOps(error);
  }
});
```

### Caching Strategy

```typescript
// Cache consent with TTL
const consentCache = new Map<string, {valid: boolean, expires: number}>();

async function checkConsent(receiptId: string): Promise<boolean> {
  const cached = consentCache.get(receiptId);
  if (cached && cached.expires > Date.now()) {
    return cached.valid;
  }

  const valid = await contract.isConsentValid(receiptId);
  consentCache.set(receiptId, {
    valid,
    expires: Date.now() + 60000 // 1 minute TTL
  });
  return valid;
}
```

### Error Handling

```typescript
// Comprehensive error handler
async function safeContractCall<T>(
  fn: () => Promise<T>,
  fallback: T,
  context: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isUserRejection(error)) {
      throw new UserCancelledError();
    }
    if (isNetworkError(error)) {
      await scheduleRetry(fn, context);
      return fallback;
    }
    throw new ContractError(context, error);
  }
}
```

## Production Checklist

### Before Deployment

- [ ] Configure proper RPC endpoints (not Infura for high-volume)
- [ ] Set up wallet management (hardware wallet, multi-sig)
- [ ] Implement event listener with reconnection logic
- [ ] Add caching layer for frequent reads
- [ ] Set up monitoring and alerting
- [ ] Configure proper gas estimation
- [ ] Implement retry logic with backoff
- [ ] Add circuit breakers for failing calls

### Security Considerations

- [ ] Never expose private keys in code
- [ ] Use environment variables for configuration
- [ ] Implement rate limiting
- [ ] Validate all user input
- [ ] Use secure RPC connections (WSS/HTTPS)
- [ ] Implement proper access control
- [ ] Audit smart contract interactions

### Monitoring

- [ ] Track transaction success rates
- [ ] Monitor event listener health
- [ ] Alert on failed transactions
- [ ] Track gas usage and costs
- [ ] Monitor contract state changes
- [ ] Set up logging for debugging

## Common Integration Scenarios

| Scenario | Pattern | Key Consideration |
|----------|---------|-------------------|
| User consent flow | Backend Service | Transaction confirmation UX |
| Real-time updates | Event-Driven | Reconnection handling |
| Batch operations | Multi-Contract | Gas optimization |
| High-availability | Error Handling | Graceful degradation |
| Audit reporting | Backend Service | Caching and pagination |
| Compliance checks | Multi-Contract | Atomic verification |

## Next Steps

After exploring these integration patterns:
- Review [Advanced Patterns](../07-advanced-patterns/) for production techniques
- Check [Compliance Audit](../08-compliance-audit/) for regulatory integration
- Refer to contract documentation for API details
