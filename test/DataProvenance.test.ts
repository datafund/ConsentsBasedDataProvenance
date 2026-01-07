import { expect } from "chai";
import { ethers } from "hardhat";
import { DataProvenance } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("DataProvenance", function () {
  let dataProvenance: DataProvenance;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const DATA_HASH_1 = ethers.keccak256(ethers.toUtf8Bytes("data1"));
  const DATA_HASH_2 = ethers.keccak256(ethers.toUtf8Bytes("data2"));
  const DATA_HASH_3 = ethers.keccak256(ethers.toUtf8Bytes("data3"));

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
    dataProvenance = await DataProvenanceFactory.deploy();
    await dataProvenance.waitForDeployment();
  });

  describe("registerData", function () {
    it("should allow user to register data", async function () {
      await expect(dataProvenance.connect(user1).registerData(DATA_HASH_1, "personal"))
        .to.emit(dataProvenance, "DataRegistered")
        .withArgs(DATA_HASH_1, user1.address, "personal");
    });

    it("should store data record correctly", async function () {
      await dataProvenance.connect(user1).registerData(DATA_HASH_1, "personal");

      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.dataHash).to.equal(DATA_HASH_1);
      expect(record.owner).to.equal(user1.address);
      expect(record.dataType).to.equal("personal");
      expect(record.status).to.equal(0); // DataStatus.Active
    });

    it("should revert when registering duplicate data hash", async function () {
      await dataProvenance.connect(user1).registerData(DATA_HASH_1, "personal");

      await expect(dataProvenance.connect(user2).registerData(DATA_HASH_1, "financial"))
        .to.be.revertedWith("Data already registered");
    });

    it("should track user data records", async function () {
      await dataProvenance.connect(user1).registerData(DATA_HASH_1, "personal");
      await dataProvenance.connect(user1).registerData(DATA_HASH_2, "financial");

      const records = await dataProvenance.getUserDataRecords(user1.address);
      expect(records.length).to.equal(2);
      expect(records[0]).to.equal(DATA_HASH_1);
      expect(records[1]).to.equal(DATA_HASH_2);
    });

    it("should revert for invalid data hash", async function () {
      await expect(
        dataProvenance.connect(user1).registerData(ethers.ZeroHash, "personal")
      ).to.be.revertedWith("Invalid data hash");
    });

    it("should revert for empty data type", async function () {
      await expect(
        dataProvenance.connect(user1).registerData(DATA_HASH_1, "")
      ).to.be.revertedWith("Data type cannot be empty");
    });

    it("should revert for data type too long", async function () {
      const longType = "a".repeat(65);
      await expect(
        dataProvenance.connect(user1).registerData(DATA_HASH_1, longType)
      ).to.be.revertedWith("Data type too long");
    });
  });

  describe("recordTransformation", function () {
    beforeEach(async function () {
      await dataProvenance.connect(user1).registerData(DATA_HASH_1, "personal");
    });

    it("should allow owner to record transformation", async function () {
      await expect(
        dataProvenance.connect(user1).recordTransformation(DATA_HASH_1, DATA_HASH_2, "anonymized")
      )
        .to.emit(dataProvenance, "DataTransformed")
        .withArgs(DATA_HASH_1, DATA_HASH_2, "anonymized");
    });

    it("should add transformation to original record", async function () {
      await dataProvenance.connect(user1).recordTransformation(DATA_HASH_1, DATA_HASH_2, "anonymized");

      const originalRecord = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(originalRecord.transformations.length).to.equal(1);
      expect(originalRecord.transformations[0]).to.equal("anonymized");
    });

    it("should create new data record for transformed data", async function () {
      await dataProvenance.connect(user1).recordTransformation(DATA_HASH_1, DATA_HASH_2, "anonymized");

      const newRecord = await dataProvenance.getDataRecord(DATA_HASH_2);
      expect(newRecord.owner).to.equal(user1.address);
      expect(newRecord.dataType).to.equal("personal");
      expect(newRecord.status).to.equal(0); // Active
    });

    it("should revert when non-owner tries to transform", async function () {
      await expect(
        dataProvenance.connect(user2).recordTransformation(DATA_HASH_1, DATA_HASH_2, "anonymized")
      ).to.be.revertedWith("Not the owner of the original data");
    });

    it("should revert when new hash already exists", async function () {
      await dataProvenance.connect(user2).registerData(DATA_HASH_2, "other");

      await expect(
        dataProvenance.connect(user1).recordTransformation(DATA_HASH_1, DATA_HASH_2, "anonymized")
      ).to.be.revertedWith("New data hash already exists");
    });

    it("should allow chained transformations", async function () {
      await dataProvenance.connect(user1).recordTransformation(DATA_HASH_1, DATA_HASH_2, "anonymized");
      await dataProvenance.connect(user1).recordTransformation(DATA_HASH_2, DATA_HASH_3, "aggregated");

      const record2 = await dataProvenance.getDataRecord(DATA_HASH_2);
      expect(record2.transformations.length).to.equal(1);
      expect(record2.transformations[0]).to.equal("aggregated");
    });

    it("should revert for empty transformation", async function () {
      await expect(
        dataProvenance.connect(user1).recordTransformation(DATA_HASH_1, DATA_HASH_2, "")
      ).to.be.revertedWith("Transformation cannot be empty");
    });

    it("should revert when data is not active", async function () {
      await dataProvenance.connect(user1).setDataStatus(DATA_HASH_1, 1); // Restricted

      await expect(
        dataProvenance.connect(user1).recordTransformation(DATA_HASH_1, DATA_HASH_2, "transform")
      ).to.be.revertedWith("Data is not active");
    });
  });

  describe("recordAccess", function () {
    beforeEach(async function () {
      await dataProvenance.connect(user1).registerData(DATA_HASH_1, "personal");
    });

    it("should allow anyone to record access", async function () {
      await expect(dataProvenance.connect(user2).recordAccess(DATA_HASH_1))
        .to.emit(dataProvenance, "DataAccessed")
        .withArgs(DATA_HASH_1, user2.address);
    });

    it("should add accessor to record only once", async function () {
      await dataProvenance.connect(user2).recordAccess(DATA_HASH_1);
      await dataProvenance.connect(user2).recordAccess(DATA_HASH_1); // Duplicate
      await dataProvenance.connect(user2).recordAccess(DATA_HASH_1); // Duplicate

      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      // Security fix: Only one entry despite multiple accesses
      expect(record.accessors.length).to.equal(1);
      expect(record.accessors[0]).to.equal(user2.address);
    });

    it("should emit event even for duplicate access", async function () {
      await dataProvenance.connect(user2).recordAccess(DATA_HASH_1);

      // Event still emitted for tracking
      await expect(dataProvenance.connect(user2).recordAccess(DATA_HASH_1))
        .to.emit(dataProvenance, "DataAccessed")
        .withArgs(DATA_HASH_1, user2.address);
    });

    it("should revert when data does not exist", async function () {
      await expect(dataProvenance.connect(user2).recordAccess(DATA_HASH_2))
        .to.be.revertedWith("Data does not exist");
    });

    it("should revert when data is not active", async function () {
      await dataProvenance.connect(user1).setDataStatus(DATA_HASH_1, 1); // Restricted

      await expect(dataProvenance.connect(user2).recordAccess(DATA_HASH_1))
        .to.be.revertedWith("Data is not active");
    });

    it("should track if address has accessed", async function () {
      expect(await dataProvenance.hasAddressAccessed(DATA_HASH_1, user2.address)).to.be.false;

      await dataProvenance.connect(user2).recordAccess(DATA_HASH_1);

      expect(await dataProvenance.hasAddressAccessed(DATA_HASH_1, user2.address)).to.be.true;
    });
  });

  describe("Data Status Management", function () {
    beforeEach(async function () {
      await dataProvenance.connect(user1).registerData(DATA_HASH_1, "personal");
    });

    it("should allow owner to change status", async function () {
      await expect(dataProvenance.connect(user1).setDataStatus(DATA_HASH_1, 1))
        .to.emit(dataProvenance, "DataStatusChanged")
        .withArgs(DATA_HASH_1, 0, 1); // Active -> Restricted
    });

    it("should revert when non-owner tries to change status", async function () {
      await expect(
        dataProvenance.connect(user2).setDataStatus(DATA_HASH_1, 1)
      ).to.be.revertedWith("Not the owner");
    });

    it("should revert when setting same status", async function () {
      await expect(
        dataProvenance.connect(user1).setDataStatus(DATA_HASH_1, 0) // Already Active
      ).to.be.revertedWith("Status unchanged");
    });
  });

  describe("Data Ownership Transfer", function () {
    beforeEach(async function () {
      await dataProvenance.connect(user1).registerData(DATA_HASH_1, "personal");
    });

    it("should allow owner to transfer ownership", async function () {
      await expect(dataProvenance.connect(user1).transferDataOwnership(DATA_HASH_1, user2.address))
        .to.emit(dataProvenance, "DataOwnershipTransferred")
        .withArgs(DATA_HASH_1, user1.address, user2.address);

      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.owner).to.equal(user2.address);
    });

    it("should revert when non-owner tries to transfer", async function () {
      await expect(
        dataProvenance.connect(user2).transferDataOwnership(DATA_HASH_1, user2.address)
      ).to.be.revertedWith("Not the owner");
    });

    it("should revert when transferring to zero address", async function () {
      await expect(
        dataProvenance.connect(user1).transferDataOwnership(DATA_HASH_1, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid new owner");
    });

    it("should revert when transferring to self", async function () {
      await expect(
        dataProvenance.connect(user1).transferDataOwnership(DATA_HASH_1, user1.address)
      ).to.be.revertedWith("Already the owner");
    });
  });

  describe("Pagination", function () {
    beforeEach(async function () {
      for (let i = 0; i < 10; i++) {
        const hash = ethers.keccak256(ethers.toUtf8Bytes(`data_${i}`));
        await dataProvenance.connect(user1).registerData(hash, "test");
      }
    });

    it("should return paginated results", async function () {
      const page1 = await dataProvenance.getUserDataRecordsPaginated(user1.address, 0, 3);
      expect(page1.length).to.equal(3);

      const page2 = await dataProvenance.getUserDataRecordsPaginated(user1.address, 3, 3);
      expect(page2.length).to.equal(3);
    });

    it("should return correct count", async function () {
      const count = await dataProvenance.getUserDataRecordsCount(user1.address);
      expect(count).to.equal(10);
    });
  });

  describe("Constants", function () {
    it("should have correct max transformations", async function () {
      expect(await dataProvenance.MAX_TRANSFORMATIONS()).to.equal(100);
    });

    it("should have correct max accessors", async function () {
      expect(await dataProvenance.MAX_ACCESSORS()).to.equal(1000);
    });
  });

  describe("Delegated Ownership", function () {
    it("should allow setting a delegate", async function () {
      await expect(dataProvenance.connect(user1).setDelegate(user2.address, true))
        .to.emit(dataProvenance, "DelegateAuthorized")
        .withArgs(user1.address, user2.address, true);

      expect(await dataProvenance.isAuthorizedDelegate(user1.address, user2.address)).to.be.true;
    });

    it("should allow revoking a delegate", async function () {
      await dataProvenance.connect(user1).setDelegate(user2.address, true);
      await dataProvenance.connect(user1).setDelegate(user2.address, false);

      expect(await dataProvenance.isAuthorizedDelegate(user1.address, user2.address)).to.be.false;
    });

    it("should revert when delegating to zero address", async function () {
      await expect(
        dataProvenance.connect(user1).setDelegate(ethers.ZeroAddress, true)
      ).to.be.revertedWith("Invalid delegate");
    });

    it("should revert when delegating to self", async function () {
      await expect(
        dataProvenance.connect(user1).setDelegate(user1.address, true)
      ).to.be.revertedWith("Cannot delegate to self");
    });

    it("should allow delegate to register data for owner", async function () {
      await dataProvenance.connect(user1).setDelegate(user2.address, true);

      await expect(
        dataProvenance.connect(user2).registerDataFor(DATA_HASH_1, "personal", user1.address)
      )
        .to.emit(dataProvenance, "DataRegistered")
        .withArgs(DATA_HASH_1, user1.address, "personal");

      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.owner).to.equal(user1.address);
    });

    it("should track delegated data in owner's records", async function () {
      await dataProvenance.connect(user1).setDelegate(user2.address, true);
      await dataProvenance.connect(user2).registerDataFor(DATA_HASH_1, "personal", user1.address);

      const records = await dataProvenance.getUserDataRecords(user1.address);
      expect(records.length).to.equal(1);
      expect(records[0]).to.equal(DATA_HASH_1);
    });

    it("should revert when non-delegate tries to register for owner", async function () {
      await expect(
        dataProvenance.connect(user2).registerDataFor(DATA_HASH_1, "personal", user1.address)
      ).to.be.revertedWith("Not authorized delegate");
    });

    it("should revert when delegate is revoked", async function () {
      await dataProvenance.connect(user1).setDelegate(user2.address, true);
      await dataProvenance.connect(user1).setDelegate(user2.address, false);

      await expect(
        dataProvenance.connect(user2).registerDataFor(DATA_HASH_1, "personal", user1.address)
      ).to.be.revertedWith("Not authorized delegate");
    });

    it("should revert for invalid owner in registerDataFor", async function () {
      await expect(
        dataProvenance.connect(user2).registerDataFor(DATA_HASH_1, "personal", ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid owner");
    });
  });

  describe("RBAC (Role-Based Access Control)", function () {
    let ADMIN_ROLE: string;
    let OPERATOR_ROLE: string;
    let AUDITOR_ROLE: string;

    beforeEach(async function () {
      ADMIN_ROLE = await dataProvenance.ADMIN_ROLE();
      OPERATOR_ROLE = await dataProvenance.OPERATOR_ROLE();
      AUDITOR_ROLE = await dataProvenance.AUDITOR_ROLE();
    });

    it("should set deployer as admin", async function () {
      expect(await dataProvenance.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await dataProvenance.contractAdmin()).to.equal(owner.address);
    });

    it("should allow admin to grant roles", async function () {
      await expect(dataProvenance.connect(owner).grantRole(OPERATOR_ROLE, user1.address))
        .to.emit(dataProvenance, "RoleGranted")
        .withArgs(OPERATOR_ROLE, user1.address, owner.address);

      expect(await dataProvenance.hasRole(OPERATOR_ROLE, user1.address)).to.be.true;
    });

    it("should allow admin to revoke roles", async function () {
      await dataProvenance.connect(owner).grantRole(OPERATOR_ROLE, user1.address);
      await dataProvenance.connect(owner).revokeRole(OPERATOR_ROLE, user1.address);

      expect(await dataProvenance.hasRole(OPERATOR_ROLE, user1.address)).to.be.false;
    });

    it("should revert when non-admin tries to grant role", async function () {
      await expect(
        dataProvenance.connect(user1).grantRole(OPERATOR_ROLE, user2.address)
      ).to.be.revertedWith("AccessControl: admin role required");
    });

    it("should allow user to renounce their own role", async function () {
      await dataProvenance.connect(owner).grantRole(OPERATOR_ROLE, user1.address);
      await dataProvenance.connect(user1).renounceRole(OPERATOR_ROLE);

      expect(await dataProvenance.hasRole(OPERATOR_ROLE, user1.address)).to.be.false;
    });

    it("should track role members", async function () {
      await dataProvenance.connect(owner).grantRole(OPERATOR_ROLE, user1.address);
      await dataProvenance.connect(owner).grantRole(OPERATOR_ROLE, user2.address);

      expect(await dataProvenance.getRoleMemberCount(OPERATOR_ROLE)).to.equal(2);
      expect(await dataProvenance.getRoleMember(OPERATOR_ROLE, 0)).to.equal(user1.address);
      expect(await dataProvenance.getRoleMember(OPERATOR_ROLE, 1)).to.equal(user2.address);
    });

    describe("Operator Functions", function () {
      beforeEach(async function () {
        await dataProvenance.connect(user1).registerData(DATA_HASH_1, "personal");
        await dataProvenance.connect(owner).grantRole(OPERATOR_ROLE, user2.address);
      });

      it("should allow operator to set data status", async function () {
        await expect(
          dataProvenance.connect(user2).operatorSetDataStatus(DATA_HASH_1, 1) // Restricted
        )
          .to.emit(dataProvenance, "DataStatusChanged")
          .withArgs(DATA_HASH_1, 0, 1);

        const record = await dataProvenance.getDataRecord(DATA_HASH_1);
        expect(record.status).to.equal(1);
      });

      it("should revert when non-operator tries operatorSetDataStatus", async function () {
        await expect(
          dataProvenance.connect(user1).operatorSetDataStatus(DATA_HASH_1, 1)
        ).to.be.revertedWith("AccessControl: account is missing role");
      });

      it("should revert when setting same status via operator", async function () {
        await expect(
          dataProvenance.connect(user2).operatorSetDataStatus(DATA_HASH_1, 0) // Already Active
        ).to.be.revertedWith("Status unchanged");
      });
    });
  });
});
