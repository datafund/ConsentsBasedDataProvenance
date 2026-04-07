import { expect } from "chai";
import { ethers } from "hardhat";
import {
  ConsentReceipt,
  DataProvenance,
  IntegratedConsentProvenanceSystem,
  KantaraConsentReceipt,
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Integration Tests", function () {
  let consentReceipt: ConsentReceipt;
  let dataProvenance: DataProvenance;
  let integratedSystem: IntegratedConsentProvenanceSystem;
  let kantaraConsent: KantaraConsentReceipt;
  let owner: SignerWithAddress;
  let dataSubject: SignerWithAddress;
  let dataProcessor: SignerWithAddress;
  let thirdParty: SignerWithAddress;
  let dataController: SignerWithAddress;

  const DATA_HASH_1 = ethers.keccak256(ethers.toUtf8Bytes("user_personal_data"));
  const DATA_HASH_2 = ethers.keccak256(ethers.toUtf8Bytes("anonymized_data"));
  const DATA_HASH_3 = ethers.keccak256(ethers.toUtf8Bytes("aggregated_data"));

  beforeEach(async function () {
    [owner, dataSubject, dataProcessor, thirdParty, dataController] = await ethers.getSigners();

    // Deploy all contracts
    const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
    consentReceipt = await ConsentReceiptFactory.deploy();
    await consentReceipt.waitForDeployment();

    const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
    dataProvenance = await DataProvenanceFactory.deploy();
    await dataProvenance.waitForDeployment();

    const IntegratedSystemFactory = await ethers.getContractFactory("IntegratedConsentProvenanceSystem");
    integratedSystem = await IntegratedSystemFactory.deploy(
      await consentReceipt.getAddress(),
      await dataProvenance.getAddress()
    );
    await integratedSystem.waitForDeployment();

    const KantaraConsentFactory = await ethers.getContractFactory("KantaraConsentReceipt");
    kantaraConsent = await KantaraConsentFactory.deploy();
    await kantaraConsent.waitForDeployment();
  });

  describe("End-to-End Data Lifecycle", function () {
    it("should complete full consent -> register -> transform -> access flow", async function () {
      // Step 1: Data subject gives consent for analytics
      await consentReceipt.connect(dataSubject)["giveConsent(string)"]("analytics");
      expect(await consentReceipt.getConsentStatus(dataSubject.address, "analytics")).to.be.true;

      // Step 2: Register personal data with consent
      await integratedSystem
        .connect(dataSubject)
        .registerDataWithConsent(DATA_HASH_1, "personal", "analytics");

      // Verify data is registered (owner is IntegratedSystem contract)
      const record1 = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record1.owner).to.equal(await integratedSystem.getAddress());
      expect(record1.dataType).to.equal("personal");
      expect(record1.status).to.equal(0); // Active

      // Step 3: Transform data (anonymize)
      await integratedSystem
        .connect(dataSubject)
        .transformDataWithConsent(DATA_HASH_1, DATA_HASH_2, "anonymized", "analytics");

      // Verify transformation recorded
      const originalRecord = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(originalRecord.transformationLinks.length).to.equal(1);
      expect(originalRecord.transformationLinks[0].newDataHash).to.equal(DATA_HASH_2);
      expect(originalRecord.transformationLinks[0].description).to.equal("anonymized");

      // Verify new data record created (owner is IntegratedSystem contract)
      const record2 = await dataProvenance.getDataRecord(DATA_HASH_2);
      expect(record2.owner).to.equal(await integratedSystem.getAddress());

      // Step 4: Third party gets consent and accesses data
      await consentReceipt.connect(thirdParty)["giveConsent(string)"]("analytics");
      await integratedSystem.connect(thirdParty).accessDataWithConsent(DATA_HASH_2, "analytics");

      // Verify access recorded (accessor is IntegratedSystem contract when going through it)
      const accessedRecord = await dataProvenance.getDataRecord(DATA_HASH_2);
      expect(accessedRecord.accessors.length).to.equal(1);
      expect(accessedRecord.accessors[0]).to.equal(await integratedSystem.getAddress());
    });

    it("should track complete data provenance chain", async function () {
      await consentReceipt.connect(dataSubject)["giveConsent(string)"]("research");

      // Register original data
      await integratedSystem
        .connect(dataSubject)
        .registerDataWithConsent(DATA_HASH_1, "survey_response", "research");

      // First transformation: anonymize
      await integratedSystem
        .connect(dataSubject)
        .transformDataWithConsent(DATA_HASH_1, DATA_HASH_2, "pseudonymized", "research");

      // Second transformation: aggregate
      await integratedSystem
        .connect(dataSubject)
        .transformDataWithConsent(DATA_HASH_2, DATA_HASH_3, "aggregated", "research");

      // Verify provenance chain via IntegratedSystem's user tracking
      const userRecords = await integratedSystem.getUserRegisteredData(dataSubject.address);
      expect(userRecords.length).to.equal(3);

      // Original has one transformation linking to DATA_HASH_2
      const original = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(original.transformationLinks[0].newDataHash).to.equal(DATA_HASH_2);
      expect(original.transformationLinks[0].description).to.equal("pseudonymized");

      // Second has one transformation linking to DATA_HASH_3
      const second = await dataProvenance.getDataRecord(DATA_HASH_2);
      expect(second.transformationLinks[0].newDataHash).to.equal(DATA_HASH_3);
      expect(second.transformationLinks[0].description).to.equal("aggregated");

      // Third has no transformations yet
      const third = await dataProvenance.getDataRecord(DATA_HASH_3);
      expect(third.transformationLinks.length).to.equal(0);

      // Verify reverse traversal via getTransformationParents
      const parents3 = await dataProvenance.getTransformationParents(DATA_HASH_3);
      expect(parents3[0]).to.equal(DATA_HASH_2);
      const parents2 = await dataProvenance.getTransformationParents(DATA_HASH_2);
      expect(parents2[0]).to.equal(DATA_HASH_1);
    });
  });

  describe("Storage Reference Bidirectional Lookup", function () {
    const SWARM_REF = ethers.keccak256(ethers.toUtf8Bytes("swarm_bee_reference"));

    it("should complete register with storageRef -> lookup by storageRef -> verify record", async function () {
      // Register data with Swarm storage reference
      await dataProvenance.connect(dataSubject)["registerData(bytes32,string,bytes32)"](
        DATA_HASH_1, "document", SWARM_REF
      );

      // Look up by storage reference
      const foundHash = await dataProvenance.getDataHashByStorageRef(SWARM_REF);
      expect(foundHash).to.equal(DATA_HASH_1);

      // Get full record from found hash
      const record = await dataProvenance.getDataRecord(foundHash);
      expect(record.owner).to.equal(dataSubject.address);
      expect(record.dataType).to.equal("document");
      expect(record.storageRef).to.equal(SWARM_REF);
      expect(record.status).to.equal(0); // Active
    });

    it("should work with consent system and storageRef", async function () {
      await consentReceipt.connect(dataSubject)["giveConsent(string)"]("storage");

      await integratedSystem.connect(dataSubject)["registerDataWithConsent(bytes32,string,string,bytes32)"](
        DATA_HASH_1, "personal", "storage", SWARM_REF
      );

      // Verify storageRef was propagated through consent system
      const foundHash = await dataProvenance.getDataHashByStorageRef(SWARM_REF);
      expect(foundHash).to.equal(DATA_HASH_1);

      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.storageRef).to.equal(SWARM_REF);

      // Verify consent tracking still works
      expect(await integratedSystem.getDataConsentPurpose(DATA_HASH_1)).to.equal("storage");
    });
  });

  describe("Consent Revocation Impact", function () {
    beforeEach(async function () {
      await consentReceipt.connect(dataSubject)["giveConsent(string)"]("marketing");
      await integratedSystem
        .connect(dataSubject)
        .registerDataWithConsent(DATA_HASH_1, "preferences", "marketing");
    });

    it("should block new operations after consent revocation", async function () {
      // Revoke consent
      await consentReceipt.connect(dataSubject).revokeConsent(0);

      // Cannot register new data
      await expect(
        integratedSystem
          .connect(dataSubject)
          .registerDataWithConsent(DATA_HASH_2, "more_data", "marketing")
      ).to.be.revertedWith("No valid consent for this purpose");

      // Cannot transform existing data
      await expect(
        integratedSystem
          .connect(dataSubject)
          .transformDataWithConsent(DATA_HASH_1, DATA_HASH_2, "processed", "marketing")
      ).to.be.revertedWith("No valid consent for this purpose");

      // Cannot access data
      await expect(
        integratedSystem.connect(dataSubject).accessDataWithConsent(DATA_HASH_1, "marketing")
      ).to.be.revertedWith("No valid consent for this purpose");
    });

    it("should allow restricting data after consent revocation", async function () {
      // Revoke consent directly
      await consentReceipt.connect(dataSubject).revokeConsent(0);

      // Restrict data associated with the purpose
      await integratedSystem.connect(dataSubject).restrictDataForPurpose("marketing");

      // Verify data is now restricted
      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.status).to.equal(1); // Restricted
    });
  });

  describe("Multi-User Scenarios", function () {
    it("should isolate consents between users", async function () {
      // User 1 gives consent
      await consentReceipt.connect(dataSubject)["giveConsent(string)"]("analytics");

      // User 1 can register data
      await integratedSystem
        .connect(dataSubject)
        .registerDataWithConsent(DATA_HASH_1, "data1", "analytics");

      // User 2 cannot register without their own consent
      await expect(
        integratedSystem
          .connect(dataProcessor)
          .registerDataWithConsent(DATA_HASH_2, "data2", "analytics")
      ).to.be.revertedWith("No valid consent for this purpose");

      // User 2 gives consent
      await consentReceipt.connect(dataProcessor)["giveConsent(string)"]("analytics");

      // Now User 2 can register
      await integratedSystem
        .connect(dataProcessor)
        .registerDataWithConsent(DATA_HASH_2, "data2", "analytics");

      // Verify both records exist (owner is IntegratedSystem in DataProvenance)
      const record1 = await dataProvenance.getDataRecord(DATA_HASH_1);
      const record2 = await dataProvenance.getDataRecord(DATA_HASH_2);
      expect(record1.owner).to.equal(await integratedSystem.getAddress());
      expect(record2.owner).to.equal(await integratedSystem.getAddress());

      // Verify user tracking in IntegratedSystem
      const user1Data = await integratedSystem.getUserRegisteredData(dataSubject.address);
      const user2Data = await integratedSystem.getUserRegisteredData(dataProcessor.address);
      expect(user1Data).to.include(DATA_HASH_1);
      expect(user2Data).to.include(DATA_HASH_2);
    });

    it("should track unique accessors for same data", async function () {
      // Register data directly via DataProvenance for access tracking test
      await dataProvenance.connect(dataSubject).registerData(DATA_HASH_1, "shared_doc");

      // Multiple users access the data directly
      await dataProvenance.connect(dataProcessor).recordAccess(DATA_HASH_1);
      await dataProvenance.connect(thirdParty).recordAccess(DATA_HASH_1);

      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.accessors.length).to.equal(2);
      expect(record.accessors).to.include(dataProcessor.address);
      expect(record.accessors).to.include(thirdParty.address);
    });

    it("should prevent duplicate access records from same user", async function () {
      await consentReceipt.connect(dataSubject)["giveConsent(string)"]("test");
      await integratedSystem
        .connect(dataSubject)
        .registerDataWithConsent(DATA_HASH_1, "test_data", "test");

      // Same user accesses multiple times
      await integratedSystem.connect(dataSubject).accessDataWithConsent(DATA_HASH_1, "test");
      await integratedSystem.connect(dataSubject).accessDataWithConsent(DATA_HASH_1, "test");
      await integratedSystem.connect(dataSubject).accessDataWithConsent(DATA_HASH_1, "test");

      // Should only have one accessor entry (deduplication)
      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.accessors.length).to.equal(1);
    });
  });

  describe("KantaraConsentReceipt Standalone Tests", function () {
    const POLICY_URL = "https://datacorp.com/privacy";
    const PI_CATEGORIES = [ethers.keccak256(ethers.toUtf8Bytes("email"))];
    const Purpose = { ServiceProvision: 0, DirectMarketing: 16 };
    const ConsentType = { Express: 0 };

    it("should create and verify Kantara-compliant consent receipt", async function () {
      const block = await ethers.provider.getBlock("latest");
      const expiryTime = block!.timestamp + 86400 * 30; // 30 days from blockchain time

      await kantaraConsent.connect(dataSubject).giveConsent(
        dataController.address,
        [Purpose.ServiceProvision, Purpose.DirectMarketing],
        PI_CATEGORIES,
        ConsentType.Express,
        expiryTime,
        true,
        POLICY_URL
      );

      // Verify consent exists
      expect(
        await kantaraConsent.hasValidConsent(
          dataSubject.address,
          dataController.address,
          Purpose.ServiceProvision
        )
      ).to.be.true;

      expect(
        await kantaraConsent.hasValidConsent(
          dataSubject.address,
          dataController.address,
          Purpose.DirectMarketing
        )
      ).to.be.true;
    });

    it("should handle consent expiry correctly", async function () {
      // Consent that expires in 100 seconds (relative to block timestamp)
      const block = await ethers.provider.getBlock("latest");
      const shortExpiry = block!.timestamp + 100;

      await kantaraConsent.connect(dataSubject).giveConsent(
        dataController.address,
        [Purpose.ServiceProvision],
        PI_CATEGORIES,
        ConsentType.Express,
        shortExpiry,
        false,
        POLICY_URL
      );

      // Initially valid
      expect(
        await kantaraConsent.hasValidConsent(
          dataSubject.address,
          dataController.address,
          Purpose.ServiceProvision
        )
      ).to.be.true;

      // Fast forward time past expiry
      await ethers.provider.send("evm_increaseTime", [150]);
      await ethers.provider.send("evm_mine", []);

      // Should be invalid due to expiry
      expect(
        await kantaraConsent.hasValidConsent(
          dataSubject.address,
          dataController.address,
          Purpose.ServiceProvision
        )
      ).to.be.false;
    });
  });

  describe("Event Emission Verification", function () {
    it("should emit all expected events during data lifecycle", async function () {
      await consentReceipt.connect(dataSubject)["giveConsent(string)"]("audit");

      // Check DataRegisteredWithConsent event
      await expect(
        integratedSystem
          .connect(dataSubject)
          .registerDataWithConsent(DATA_HASH_1, "audit_log", "audit")
      )
        .to.emit(integratedSystem, "DataRegisteredWithConsent")
        .withArgs(DATA_HASH_1, dataSubject.address, "audit_log", "audit");

      // Check DataAccessedWithConsent event
      await expect(
        integratedSystem.connect(dataSubject).accessDataWithConsent(DATA_HASH_1, "audit")
      )
        .to.emit(integratedSystem, "DataAccessedWithConsent")
        .withArgs(DATA_HASH_1, dataSubject.address, "audit");

      // Check DataTransformedWithConsent event (now implemented)
      await expect(
        integratedSystem
          .connect(dataSubject)
          .transformDataWithConsent(DATA_HASH_1, DATA_HASH_2, "modified", "audit")
      )
        .to.emit(integratedSystem, "DataTransformedWithConsent")
        .withArgs(DATA_HASH_1, DATA_HASH_2, "modified", "audit");
    });
  });

  describe("Data Status Management", function () {
    beforeEach(async function () {
      // Register data directly via DataProvenance so dataSubject is the owner
      await dataProvenance.connect(dataSubject).registerData(DATA_HASH_1, "test_data");
      await consentReceipt.connect(dataSubject)["giveConsent(string)"]("test");
    });

    it("should allow owner to change data status", async function () {
      await dataProvenance.connect(dataSubject).setDataStatus(DATA_HASH_1, 1); // Restricted

      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.status).to.equal(1);
    });

    it("should block operations on non-active data", async function () {
      await dataProvenance.connect(dataSubject).setDataStatus(DATA_HASH_1, 1); // Restricted

      // Cannot transform restricted data
      await expect(
        dataProvenance.connect(dataSubject).recordTransformation(DATA_HASH_1, DATA_HASH_2, "transform")
      ).to.be.revertedWith("Data is not active");

      // Cannot access restricted data
      await expect(
        dataProvenance.connect(thirdParty).recordAccess(DATA_HASH_1)
      ).to.be.revertedWith("Data is not active");
    });
  });

  describe("Data Ownership Transfer", function () {
    beforeEach(async function () {
      // Register data directly via DataProvenance so dataSubject is the owner
      await dataProvenance.connect(dataSubject).registerData(DATA_HASH_1, "transferable");
    });

    it("should allow ownership transfer", async function () {
      await dataProvenance.connect(dataSubject).transferDataOwnership(DATA_HASH_1, dataProcessor.address);

      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.owner).to.equal(dataProcessor.address);
    });

    it("should allow new owner to transform data", async function () {
      await dataProvenance.connect(dataSubject).transferDataOwnership(DATA_HASH_1, dataProcessor.address);

      // New owner can transform directly via DataProvenance
      await dataProvenance.connect(dataProcessor).recordTransformation(DATA_HASH_1, DATA_HASH_2, "new_owner_transform");

      const record = await dataProvenance.getDataRecord(DATA_HASH_2);
      expect(record.owner).to.equal(dataProcessor.address);
    });
  });
});
