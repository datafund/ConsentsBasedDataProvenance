# 06 - IoT & Supply Chain

This section demonstrates IoT device data management and supply chain provenance tracking using the consent-based data provenance system.

## Target Audience

- **Developers**: Learn IoT integration patterns
- **Business Operators**: Supply chain managers
- **Compliance Officers**: Regulatory compliance tracking
- **City Planners**: Smart city data governance

## Use Cases

### IoT Applications
- **Smart Devices**: Track data from connected devices
- **Sensors**: Environmental and industrial monitoring
- **Wearables**: Personal health device data
- **Connected Vehicles**: Telematics data management

### Supply Chain Applications
- **Manufacturing**: Product data through assembly
- **Logistics**: Shipping and handling tracking
- **Quality Control**: Testing and certification records
- **Recalls**: Traceability for product recalls

## Examples

### 01 - Device Registration
Register IoT device data with consent.

```bash
npx hardhat run examples/06-iot-supply-chain/01-device-registration.ts --network localhost
```

**Scenario:**
```
Smart home device setup:
├── User registers device
├── Consent for data collection
├── Device data registered
└── Data access tracked
```

**Demonstrates:**
- Device-to-user consent linkage
- Data collection consent
- Device data registration

### 02 - Sensor Provenance
Track sensor reading lineage.

```bash
npx hardhat run examples/06-iot-supply-chain/02-sensor-provenance.ts --network localhost
```

**Scenario:**
```
Industrial sensor monitoring:
├── Sensor readings collected
├── Data aggregated
├── Transformations tracked
└── Complete data lineage
```

**Demonstrates:**
- Time-series data tracking
- Data aggregation provenance
- Sensor calibration records

### 03 - Manufacturing Chain
Product data through supply chain.

```bash
npx hardhat run examples/06-iot-supply-chain/03-manufacturing-chain.ts --network localhost
```

**Scenario:**
```
Product manufacturing:
Raw Materials → Assembly → QC → Packaging → Shipping
                    ↓
             Provenance at each stage
```

**Demonstrates:**
- Multi-stage transformation
- Quality control records
- Chain of custody

### 04 - Smart City
Citizen consent for city data collection.

```bash
npx hardhat run examples/06-iot-supply-chain/04-smart-city.ts --network localhost
```

**Scenario:**
```
Smart city services:
├── Citizen opts into services
├── Location data collection
├── Traffic monitoring consent
└── Privacy preferences respected
```

**Demonstrates:**
- Citizen data consent
- Municipal service consent
- Privacy-preserving data collection

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    IoT Data Flow                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────┐     ┌───────────────┐     ┌─────────────────┐     │
│  │  Device  │────▶│ Data Collection│────▶│ ConsentReceipt  │     │
│  └──────────┘     └───────────────┘     └─────────────────┘     │
│                          │                       │               │
│                          ▼                       ▼               │
│  ┌──────────┐     ┌───────────────┐     ┌─────────────────┐     │
│  │  Gateway │────▶│ Register Data │────▶│ DataProvenance  │     │
│  └──────────┘     └───────────────┘     └─────────────────┘     │
│                          │                       │               │
│                          ▼                       ▼               │
│  ┌──────────┐     ┌───────────────┐     ┌─────────────────┐     │
│  │  Cloud   │────▶│ Process/Store │────▶│ Transformation  │     │
│  └──────────┘     └───────────────┘     │ Tracking        │     │
│                                         └─────────────────┘     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Supply Chain Flow                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Raw Materials ──▶ Manufacturing ──▶ QC ──▶ Distribution        │
│       │                 │            │           │               │
│       ▼                 ▼            ▼           ▼               │
│  [Register]        [Transform]   [Update]   [Transfer]          │
│       │                 │            │           │               │
│       └─────────────────┴────────────┴───────────┘               │
│                         │                                        │
│                         ▼                                        │
│                 DataProvenance                                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Contract Mapping

| Function | Contract | Purpose |
|----------|----------|---------|
| Device consent | ConsentReceipt | Data collection authorization |
| Data registration | DataProvenance | Record device data |
| Transformations | DataProvenance | Track data processing |
| Access logging | DataProvenance | Track data consumers |
| Audit | ConsentAuditLog | Compliance reporting |

## Data Types

| Category | Data Type | Consent Required |
|----------|-----------|------------------|
| Smart Home | Temperature, energy usage | Yes |
| Wearables | Heart rate, location | Yes |
| Industrial | Sensor readings | Per agreement |
| Supply Chain | Product data | Business agreement |
| Smart City | Anonymized traffic | Opt-in |

## Next Steps

After completing these examples, explore:
- [Advanced Patterns](../07-advanced-patterns/) - Batch operations for IoT
- [Integration Patterns](../09-integration-patterns/) - Event-driven architectures
- [Compliance & Audit](../08-compliance-audit/) - IoT data compliance
