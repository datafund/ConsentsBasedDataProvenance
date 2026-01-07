/**
 * Shared Setup Utilities
 *
 * Provides contract deployment and initialization functions
 * used across all example scenarios.
 */

import { ethers } from "hardhat";
import {
  ConsentReceipt,
  DataProvenance,
  IntegratedConsentProvenanceSystem,
  KantaraConsentReceipt,
  ConsentAuditLog,
  ConsentProxy,
  DataAccessControl,
  DataDeletion,
  PurposeRegistry
} from "../../typechain-types";

export interface DeployedContracts {
  consentReceipt: ConsentReceipt;
  dataProvenance: DataProvenance;
  integratedSystem: IntegratedConsentProvenanceSystem;
  kantaraConsent: KantaraConsentReceipt;
  auditLog: ConsentAuditLog;
  consentProxy: ConsentProxy;
  dataAccessControl: DataAccessControl;
  dataDeletion: DataDeletion;
  purposeRegistry: PurposeRegistry;
}

/**
 * Deploy all core contracts
 * Used when examples need the full contract suite
 */
export async function deployAllContracts(): Promise<DeployedContracts> {
  // Deploy core contracts
  const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceiptFactory.deploy();
  await consentReceipt.waitForDeployment();

  const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
  const dataProvenance = await DataProvenanceFactory.deploy();
  await dataProvenance.waitForDeployment();

  const IntegratedFactory = await ethers.getContractFactory("IntegratedConsentProvenanceSystem");
  const integratedSystem = await IntegratedFactory.deploy(
    await consentReceipt.getAddress(),
    await dataProvenance.getAddress()
  );
  await integratedSystem.waitForDeployment();

  const KantaraFactory = await ethers.getContractFactory("KantaraConsentReceipt");
  const kantaraConsent = await KantaraFactory.deploy();
  await kantaraConsent.waitForDeployment();

  // Deploy supporting contracts
  const AuditLogFactory = await ethers.getContractFactory("ConsentAuditLog");
  const auditLog = await AuditLogFactory.deploy();
  await auditLog.waitForDeployment();

  const ConsentProxyFactory = await ethers.getContractFactory("ConsentProxy");
  const consentProxy = await ConsentProxyFactory.deploy();
  await consentProxy.waitForDeployment();

  const DataAccessControlFactory = await ethers.getContractFactory("DataAccessControl");
  const dataAccessControl = await DataAccessControlFactory.deploy(
    await dataProvenance.getAddress()
  );
  await dataAccessControl.waitForDeployment();

  const DataDeletionFactory = await ethers.getContractFactory("DataDeletion");
  const dataDeletion = await DataDeletionFactory.deploy(
    await dataProvenance.getAddress()
  );
  await dataDeletion.waitForDeployment();

  const PurposeRegistryFactory = await ethers.getContractFactory("PurposeRegistry");
  const purposeRegistry = await PurposeRegistryFactory.deploy();
  await purposeRegistry.waitForDeployment();

  return {
    consentReceipt,
    dataProvenance,
    integratedSystem,
    kantaraConsent,
    auditLog,
    consentProxy,
    dataAccessControl,
    dataDeletion,
    purposeRegistry
  };
}

/**
 * Deploy only core contracts (ConsentReceipt, DataProvenance, IntegratedSystem)
 * Used for simpler examples that don't need all contracts
 */
export async function deployCoreContracts() {
  const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceiptFactory.deploy();
  await consentReceipt.waitForDeployment();

  const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
  const dataProvenance = await DataProvenanceFactory.deploy();
  await dataProvenance.waitForDeployment();

  const IntegratedFactory = await ethers.getContractFactory("IntegratedConsentProvenanceSystem");
  const integratedSystem = await IntegratedFactory.deploy(
    await consentReceipt.getAddress(),
    await dataProvenance.getAddress()
  );
  await integratedSystem.waitForDeployment();

  return { consentReceipt, dataProvenance, integratedSystem };
}

/**
 * Deploy only ConsentReceipt for basic examples
 */
export async function deployConsentReceipt() {
  const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
  const consentReceipt = await ConsentReceiptFactory.deploy();
  await consentReceipt.waitForDeployment();
  return consentReceipt;
}

/**
 * Deploy KantaraConsentReceipt for compliance examples
 */
export async function deployKantaraConsent() {
  const KantaraFactory = await ethers.getContractFactory("KantaraConsentReceipt");
  const kantaraConsent = await KantaraFactory.deploy();
  await kantaraConsent.waitForDeployment();
  return kantaraConsent;
}

/**
 * Get test signers with named roles
 */
export async function getNamedSigners() {
  const signers = await ethers.getSigners();
  return {
    deployer: signers[0],
    admin: signers[0],
    user1: signers[1],
    user2: signers[2],
    user3: signers[3],
    operator: signers[4],
    auditor: signers[5],
    // Domain-specific aliases
    patient: signers[1],
    doctor: signers[2],
    hospital: signers[3],
    researcher: signers[4],
    customer: signers[1],
    bank: signers[2],
    creditBureau: signers[3],
    regulator: signers[4],
    consumer: signers[1],
    marketer: signers[2],
    adNetwork: signers[3]
  };
}
