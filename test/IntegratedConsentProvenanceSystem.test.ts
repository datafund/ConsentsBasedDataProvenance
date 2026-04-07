import { expect } from "chai";
import { ethers } from "hardhat";
import { ConsentReceipt, DataProvenance, IntegratedConsentProvenanceSystem } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("IntegratedConsentProvenanceSystem", function () {
  let consentReceipt: ConsentReceipt;
  let dataProvenance: DataProvenance;
  let integratedSystem: IntegratedConsentProvenanceSystem;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const DATA_HASH_1 = ethers.keccak256(ethers.toUtf8Bytes("data1"));
  const DATA_HASH_2 = ethers.keccak256(ethers.toUtf8Bytes("data2"));

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy ConsentReceipt
    const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
    consentReceipt = await ConsentReceiptFactory.deploy();
    await consentReceipt.waitForDeployment();

    // Deploy DataProvenance
    const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
    dataProvenance = await DataProvenanceFactory.deploy();
    await dataProvenance.waitForDeployment();

    // Deploy IntegratedConsentProvenanceSystem
    const IntegratedSystemFactory = await ethers.getContractFactory("IntegratedConsentProvenanceSystem");
    integratedSystem = await IntegratedSystemFactory.deploy(
      await consentReceipt.getAddress(),
      await dataProvenance.getAddress()
    );
    await integratedSystem.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should store correct contract references", async function () {
      expect(await integratedSystem.consentContract()).to.equal(await consentReceipt.getAddress());
      expect(await integratedSystem.provenanceContract()).to.equal(await dataProvenance.getAddress());
    });

    it("should revert with zero address for consent contract", async function () {
      const IntegratedSystemFactory = await ethers.getContractFactory("IntegratedConsentProvenanceSystem");
      await expect(
        IntegratedSystemFactory.deploy(ethers.ZeroAddress, await dataProvenance.getAddress())
      ).to.be.revertedWith("Invalid consent contract address");
    });

    it("should revert with zero address for provenance contract", async function () {
      const IntegratedSystemFactory = await ethers.getContractFactory("IntegratedConsentProvenanceSystem");
      await expect(
        IntegratedSystemFactory.deploy(await consentReceipt.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid provenance contract address");
    });
  });

  describe("registerDataWithConsent", function () {
    it("should allow registration with valid consent", async function () {
      await consentReceipt.connect(user1)["giveConsent(string)"]("analytics");

      await expect(
        integratedSystem.connect(user1).registerDataWithConsent(DATA_HASH_1, "personal", "analytics")
      )
        .to.emit(integratedSystem, "DataRegisteredWithConsent")
        .withArgs(DATA_HASH_1, user1.address, "personal", "analytics");
    });

    it("should track consent purpose for data", async function () {
      await consentReceipt.connect(user1)["giveConsent(string)"]("analytics");
      await integratedSystem.connect(user1).registerDataWithConsent(DATA_HASH_1, "personal", "analytics");

      expect(await integratedSystem.getDataConsentPurpose(DATA_HASH_1)).to.equal("analytics");
    });

    it("should revert without valid consent", async function () {
      await expect(
        integratedSystem.connect(user1).registerDataWithConsent(DATA_HASH_1, "personal", "analytics")
      ).to.be.revertedWith("No valid consent for this purpose");
    });

    it("should revert with wrong purpose consent", async function () {
      await consentReceipt.connect(user1)["giveConsent(string)"]("marketing");

      await expect(
        integratedSystem.connect(user1).registerDataWithConsent(DATA_HASH_1, "personal", "analytics")
      ).to.be.revertedWith("No valid consent for this purpose");
    });

    it("should revert after consent is revoked", async function () {
      await consentReceipt.connect(user1)["giveConsent(string)"]("analytics");
      await consentReceipt.connect(user1).revokeConsent(0);

      await expect(
        integratedSystem.connect(user1).registerDataWithConsent(DATA_HASH_1, "personal", "analytics")
      ).to.be.revertedWith("No valid consent for this purpose");
    });
  });

  describe("registerDataWithConsent with storageRef", function () {
    const STORAGE_REF = ethers.keccak256(ethers.toUtf8Bytes("swarm_ref"));

    it("should register data with storageRef through consent system", async function () {
      await consentReceipt.connect(user1)["giveConsent(string)"]("analytics");

      await integratedSystem.connect(user1)["registerDataWithConsent(bytes32,string,string,bytes32)"](
        DATA_HASH_1, "personal", "analytics", STORAGE_REF
      );

      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.storageRef).to.equal(STORAGE_REF);
      expect(await dataProvenance.getDataHashByStorageRef(STORAGE_REF)).to.equal(DATA_HASH_1);
    });

    it("should revert without valid consent", async function () {
      await expect(
        integratedSystem.connect(user1)["registerDataWithConsent(bytes32,string,string,bytes32)"](
          DATA_HASH_1, "personal", "analytics", STORAGE_REF
        )
      ).to.be.revertedWith("No valid consent for this purpose");
    });
  });

  describe("registerDataForWithConsent with storageRef", function () {
    const STORAGE_REF = ethers.keccak256(ethers.toUtf8Bytes("swarm_ref"));

    beforeEach(async function () {
      await dataProvenance.connect(user1).setDelegate(user2.address, true);
      await dataProvenance.connect(user1).setDelegate(await integratedSystem.getAddress(), true);
      await consentReceipt.connect(user1)["giveConsent(string)"]("analytics");
    });

    it("should allow delegated registration with storageRef", async function () {
      await integratedSystem.connect(user2)["registerDataForWithConsent(bytes32,string,string,address,bytes32)"](
        DATA_HASH_1, "personal", "analytics", user1.address, STORAGE_REF
      );

      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.owner).to.equal(user1.address);
      expect(record.storageRef).to.equal(STORAGE_REF);
      expect(await dataProvenance.getDataHashByStorageRef(STORAGE_REF)).to.equal(DATA_HASH_1);
    });
  });

  describe("accessDataWithConsent", function () {
    beforeEach(async function () {
      await consentReceipt.connect(user1)["giveConsent(string)"]("analytics");
      await integratedSystem.connect(user1).registerDataWithConsent(DATA_HASH_1, "personal", "analytics");
    });

    it("should allow access with valid consent", async function () {
      await consentReceipt.connect(user2)["giveConsent(string)"]("analytics");

      await expect(
        integratedSystem.connect(user2).accessDataWithConsent(DATA_HASH_1, "analytics")
      )
        .to.emit(integratedSystem, "DataAccessedWithConsent")
        .withArgs(DATA_HASH_1, user2.address, "analytics");
    });

    it("should revert without valid consent", async function () {
      await expect(
        integratedSystem.connect(user2).accessDataWithConsent(DATA_HASH_1, "analytics")
      ).to.be.revertedWith("No valid consent for this purpose");
    });
  });

  describe("transformDataWithConsent", function () {
    beforeEach(async function () {
      await consentReceipt.connect(user1)["giveConsent(string)"]("analytics");
      await integratedSystem.connect(user1).registerDataWithConsent(DATA_HASH_1, "personal", "analytics");
    });

    it("should allow transformation with valid consent", async function () {
      await expect(
        integratedSystem
          .connect(user1)
          .transformDataWithConsent(DATA_HASH_1, DATA_HASH_2, "anonymized", "analytics")
      )
        .to.emit(integratedSystem, "DataTransformedWithConsent")
        .withArgs(DATA_HASH_1, DATA_HASH_2, "anonymized", "analytics");
    });

    it("should track consent purpose for transformed data", async function () {
      await integratedSystem
        .connect(user1)
        .transformDataWithConsent(DATA_HASH_1, DATA_HASH_2, "anonymized", "analytics");

      expect(await integratedSystem.getDataConsentPurpose(DATA_HASH_2)).to.equal("analytics");
    });

    it("should revert without valid consent", async function () {
      await consentReceipt.connect(user1).revokeConsent(0);

      await expect(
        integratedSystem
          .connect(user1)
          .transformDataWithConsent(DATA_HASH_1, DATA_HASH_2, "anonymized", "analytics")
      ).to.be.revertedWith("No valid consent for this purpose");
    });
  });

  describe("restrictDataForPurpose", function () {
    beforeEach(async function () {
      await consentReceipt.connect(user1)["giveConsent(string)"]("analytics");
      await integratedSystem.connect(user1).registerDataWithConsent(DATA_HASH_1, "personal", "analytics");
    });

    it("should restrict data after consent revocation", async function () {
      // Revoke consent first (directly on ConsentReceipt)
      await consentReceipt.connect(user1).revokeConsent(0);

      // Then restrict associated data
      await expect(integratedSystem.connect(user1).restrictDataForPurpose("analytics"))
        .to.emit(integratedSystem, "ConsentRevokedWithDataRestriction");

      // Verify data is now restricted
      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.status).to.equal(1); // Restricted
    });

    it("should revert if consent is still valid", async function () {
      await expect(
        integratedSystem.connect(user1).restrictDataForPurpose("analytics")
      ).to.be.revertedWith("Consent still valid");
    });
  });

  describe("isDataAccessAllowed", function () {
    beforeEach(async function () {
      await consentReceipt.connect(user1)["giveConsent(string)"]("analytics");
      await integratedSystem.connect(user1).registerDataWithConsent(DATA_HASH_1, "personal", "analytics");
    });

    it("should return true when user has valid consent", async function () {
      await consentReceipt.connect(user2)["giveConsent(string)"]("analytics");
      expect(await integratedSystem.isDataAccessAllowed(user2.address, DATA_HASH_1)).to.be.true;
    });

    it("should return false when user has no consent", async function () {
      expect(await integratedSystem.isDataAccessAllowed(user2.address, DATA_HASH_1)).to.be.false;
    });

    it("should return false for data without consent purpose", async function () {
      expect(await integratedSystem.isDataAccessAllowed(user1.address, DATA_HASH_2)).to.be.false;
    });
  });

  describe("Cross-contract interaction", function () {
    it("should properly link consent and data operations", async function () {
      // Give consent
      await consentReceipt.connect(user1)["giveConsent(string)"]("analytics");

      // Register data with consent
      await integratedSystem.connect(user1).registerDataWithConsent(DATA_HASH_1, "personal", "analytics");

      // Verify data is registered in DataProvenance (owner is the IntegratedSystem contract)
      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.owner).to.equal(await integratedSystem.getAddress());
      expect(record.dataType).to.equal("personal");

      // Verify user has the data hash tracked via IntegratedSystem
      const userRecords = await integratedSystem.getUserRegisteredData(user1.address);
      expect(userRecords).to.include(DATA_HASH_1);
    });
  });

  describe("Delegated Registration", function () {
    beforeEach(async function () {
      // User1 authorizes user2 as a delegate for consent checking
      await dataProvenance.connect(user1).setDelegate(user2.address, true);
      // User1 authorizes the IntegratedSystem contract as a delegate in DataProvenance
      // This allows IntegratedSystem to call registerDataFor on behalf of user1
      await dataProvenance.connect(user1).setDelegate(await integratedSystem.getAddress(), true);
      // User1 gives consent
      await consentReceipt.connect(user1)["giveConsent(string)"]("analytics");
    });

    it("should allow delegate to register data for owner with consent", async function () {
      await expect(
        integratedSystem.connect(user2).registerDataForWithConsent(
          DATA_HASH_1,
          "personal",
          "analytics",
          user1.address
        )
      )
        .to.emit(integratedSystem, "DelegatedDataRegistered")
        .withArgs(DATA_HASH_1, user1.address, user2.address, "personal", "analytics");
    });

    it("should track data in actual owner's records", async function () {
      await integratedSystem.connect(user2).registerDataForWithConsent(
        DATA_HASH_1,
        "personal",
        "analytics",
        user1.address
      );

      const userRecords = await integratedSystem.getUserRegisteredData(user1.address);
      expect(userRecords).to.include(DATA_HASH_1);

      // Delegate should not have it in their records
      const delegateRecords = await integratedSystem.getUserRegisteredData(user2.address);
      expect(delegateRecords).to.not.include(DATA_HASH_1);
    });

    it("should set actual owner as data owner in DataProvenance", async function () {
      await integratedSystem.connect(user2).registerDataForWithConsent(
        DATA_HASH_1,
        "personal",
        "analytics",
        user1.address
      );

      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.owner).to.equal(user1.address);
    });

    it("should revert when caller is not authorized delegate", async function () {
      await expect(
        integratedSystem.connect(owner).registerDataForWithConsent(
          DATA_HASH_1,
          "personal",
          "analytics",
          user1.address
        )
      ).to.be.revertedWith("Not authorized delegate");
    });

    it("should revert when owner has no valid consent", async function () {
      // Revoke user1's consent
      await consentReceipt.connect(user1).revokeConsent(0);

      await expect(
        integratedSystem.connect(user2).registerDataForWithConsent(
          DATA_HASH_1,
          "personal",
          "analytics",
          user1.address
        )
      ).to.be.revertedWith("Owner has no valid consent for this purpose");
    });

    it("should revert when delegate authorization is revoked", async function () {
      await dataProvenance.connect(user1).setDelegate(user2.address, false);

      await expect(
        integratedSystem.connect(user2).registerDataForWithConsent(
          DATA_HASH_1,
          "personal",
          "analytics",
          user1.address
        )
      ).to.be.revertedWith("Not authorized delegate");
    });
  });
});
