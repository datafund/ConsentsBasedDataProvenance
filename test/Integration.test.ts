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

      // Verify data is registered
      const record1 = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record1.owner).to.equal(dataSubject.address);
      expect(record1.dataType).to.equal("personal");
      expect(record1.status).to.equal(0); // Active

      // Step 3: Transform data (anonymize)
      await integratedSystem
        .connect(dataSubject)
        .transformDataWithConsent(DATA_HASH_1, DATA_HASH_2, "anonymized", "analytics");

      // Verify transformation recorded
      const originalRecord = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(originalRecord.transformations.length).to.equal(1);
      expect(originalRecord.transformations[0]).to.equal("anonymized");

      // Verify new data record created
      const record2 = await dataProvenance.getDataRecord(DATA_HASH_2);
      expect(record2.owner).to.equal(dataSubject.address);

      // Step 4: Third party gets consent and accesses data
      await consentReceipt.connect(thirdParty)["giveConsent(string)"]("analytics");
      await integratedSystem.connect(thirdParty).accessDataWithConsent(DATA_HASH_2, "analytics");

      // Verify access recorded (only once due to deduplication)
      const accessedRecord = await dataProvenance.getDataRecord(DATA_HASH_2);
      expect(accessedRecord.accessors.length).to.equal(1);
      expect(accessedRecord.accessors[0]).to.equal(thirdParty.address);
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

      // Verify provenance chain
      const userRecords = await dataProvenance.getUserDataRecords(dataSubject.address);
      expect(userRecords.length).to.equal(3);

      // Original has one transformation
      const original = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(original.transformations[0]).to.equal("pseudonymized");

      // Second has one transformation
      const second = await dataProvenance.getDataRecord(DATA_HASH_2);
      expect(second.transformations[0]).to.equal("aggregated");

      // Third has no transformations yet
      const third = await dataProvenance.getDataRecord(DATA_HASH_3);
      expect(third.transformations.length).to.equal(0);
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

      // Verify both records exist with correct owners
      const record1 = await dataProvenance.getDataRecord(DATA_HASH_1);
      const record2 = await dataProvenance.getDataRecord(DATA_HASH_2);
      expect(record1.owner).to.equal(dataSubject.address);
      expect(record2.owner).to.equal(dataProcessor.address);
    });

    it("should track unique accessors for same data", async function () {
      await consentReceipt.connect(dataSubject)["giveConsent(string)"]("shared");
      await integratedSystem
        .connect(dataSubject)
        .registerDataWithConsent(DATA_HASH_1, "shared_doc", "shared");

      // Multiple users access the data
      await consentReceipt.connect(dataProcessor)["giveConsent(string)"]("shared");
      await consentReceipt.connect(thirdParty)["giveConsent(string)"]("shared");

      await integratedSystem.connect(dataProcessor).accessDataWithConsent(DATA_HASH_1, "shared");
      await integratedSystem.connect(thirdParty).accessDataWithConsent(DATA_HASH_1, "shared");

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
      const expiryTime = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days

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
      // Consent that expires in 1 second
      const shortExpiry = Math.floor(Date.now() / 1000) + 1;

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

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [10]);
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
      await consentReceipt.connect(dataSubject)["giveConsent(string)"]("test");
      await integratedSystem
        .connect(dataSubject)
        .registerDataWithConsent(DATA_HASH_1, "test_data", "test");
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
        integratedSystem
          .connect(dataSubject)
          .transformDataWithConsent(DATA_HASH_1, DATA_HASH_2, "transform", "test")
      ).to.be.revertedWith("Data is not active");

      // Cannot access restricted data
      await expect(
        integratedSystem.connect(dataSubject).accessDataWithConsent(DATA_HASH_1, "test")
      ).to.be.revertedWith("Data is not active");
    });
  });

  describe("Data Ownership Transfer", function () {
    beforeEach(async function () {
      await consentReceipt.connect(dataSubject)["giveConsent(string)"]("test");
      await integratedSystem
        .connect(dataSubject)
        .registerDataWithConsent(DATA_HASH_1, "transferable", "test");
    });

    it("should allow ownership transfer", async function () {
      await dataProvenance.connect(dataSubject).transferDataOwnership(DATA_HASH_1, dataProcessor.address);

      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.owner).to.equal(dataProcessor.address);
    });

    it("should allow new owner to transform data", async function () {
      await dataProvenance.connect(dataSubject).transferDataOwnership(DATA_HASH_1, dataProcessor.address);

      // New owner needs consent
      await consentReceipt.connect(dataProcessor)["giveConsent(string)"]("test");

      // New owner can transform
      await integratedSystem
        .connect(dataProcessor)
        .transformDataWithConsent(DATA_HASH_1, DATA_HASH_2, "new_owner_transform", "test");

      const record = await dataProvenance.getDataRecord(DATA_HASH_2);
      expect(record.owner).to.equal(dataProcessor.address);
    });
  });
});
