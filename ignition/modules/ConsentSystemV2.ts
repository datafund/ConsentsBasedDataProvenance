import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ConsentSystemV2Module = buildModule("ConsentSystemV2", (m) => {
  // Tier 1: No constructor parameters
  const consentReceipt = m.contract("ConsentReceipt");
  const dataProvenance = m.contract("DataProvenance");
  const kantaraConsentReceipt = m.contract("KantaraConsentReceipt");
  const consentAuditLog = m.contract("ConsentAuditLog");
  const consentProxy = m.contract("ConsentProxy");
  const purposeRegistry = m.contract("PurposeRegistry");

  // Tier 2: Depends on DataProvenance
  const dataAccessControl = m.contract("DataAccessControl", [dataProvenance]);
  const dataDeletion = m.contract("DataDeletion", [dataProvenance]);

  // Tier 3: Depends on ConsentReceipt + DataProvenance
  const integratedSystem = m.contract(
    "IntegratedConsentProvenanceSystem",
    [consentReceipt, dataProvenance]
  );

  return {
    consentReceipt,
    dataProvenance,
    kantaraConsentReceipt,
    consentAuditLog,
    consentProxy,
    purposeRegistry,
    dataAccessControl,
    dataDeletion,
    integratedSystem,
  };
});

export default ConsentSystemV2Module;
