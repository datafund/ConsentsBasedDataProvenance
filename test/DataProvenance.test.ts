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

  describe("storageRef", function () {
    const STORAGE_REF_1 = ethers.keccak256(ethers.toUtf8Bytes("swarm_ref_1"));
    const STORAGE_REF_2 = ethers.keccak256(ethers.toUtf8Bytes("swarm_ref_2"));

    it("should register data with storage reference", async function () {
      await expect(
        dataProvenance.connect(user1)["registerData(bytes32,string,bytes32)"](DATA_HASH_1, "personal", STORAGE_REF_1)
      )
        .to.emit(dataProvenance, "DataRegistered")
        .withArgs(DATA_HASH_1, user1.address, "personal")
        .and.to.emit(dataProvenance, "StorageRefLinked")
        .withArgs(DATA_HASH_1, STORAGE_REF_1);
    });

    it("should store storageRef in data record", async function () {
      await dataProvenance.connect(user1)["registerData(bytes32,string,bytes32)"](DATA_HASH_1, "personal", STORAGE_REF_1);

      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.storageRef).to.equal(STORAGE_REF_1);
    });

    it("should allow reverse lookup by storageRef", async function () {
      await dataProvenance.connect(user1)["registerData(bytes32,string,bytes32)"](DATA_HASH_1, "personal", STORAGE_REF_1);

      expect(await dataProvenance.getDataHashByStorageRef(STORAGE_REF_1)).to.equal(DATA_HASH_1);
    });

    it("should return zero hash for unknown storageRef", async function () {
      expect(await dataProvenance.getDataHashByStorageRef(STORAGE_REF_1)).to.equal(ethers.ZeroHash);
    });

    it("should store zero storageRef when registered without one", async function () {
      await dataProvenance.connect(user1).registerData(DATA_HASH_1, "personal");

      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.storageRef).to.equal(ethers.ZeroHash);
    });

    it("should not emit StorageRefLinked when registered without storageRef", async function () {
      await expect(
        dataProvenance.connect(user1).registerData(DATA_HASH_1, "personal")
      ).to.not.emit(dataProvenance, "StorageRefLinked");
    });

    it("should not populate reverse mapping for zero storageRef", async function () {
      await dataProvenance.connect(user1).registerData(DATA_HASH_1, "personal");

      expect(await dataProvenance.getDataHashByStorageRef(ethers.ZeroHash)).to.equal(ethers.ZeroHash);
    });

    it("should revert when storageRef is already mapped", async function () {
      await dataProvenance.connect(user1)["registerData(bytes32,string,bytes32)"](DATA_HASH_1, "personal", STORAGE_REF_1);

      await expect(
        dataProvenance.connect(user2)["registerData(bytes32,string,bytes32)"](DATA_HASH_2, "financial", STORAGE_REF_1)
      ).to.be.revertedWith("Storage ref already mapped");
    });

    it("should revert when storageRef equals data hash", async function () {
      await expect(
        dataProvenance.connect(user1)["registerData(bytes32,string,bytes32)"](DATA_HASH_1, "personal", DATA_HASH_1)
      ).to.be.revertedWith("Storage ref cannot equal data hash");
    });

    it("should allow different storageRefs for different data hashes", async function () {
      await dataProvenance.connect(user1)["registerData(bytes32,string,bytes32)"](DATA_HASH_1, "personal", STORAGE_REF_1);
      await dataProvenance.connect(user1)["registerData(bytes32,string,bytes32)"](DATA_HASH_2, "financial", STORAGE_REF_2);

      expect(await dataProvenance.getDataHashByStorageRef(STORAGE_REF_1)).to.equal(DATA_HASH_1);
      expect(await dataProvenance.getDataHashByStorageRef(STORAGE_REF_2)).to.equal(DATA_HASH_2);
    });

    it("should support delegated registration with storageRef", async function () {
      await dataProvenance.connect(user1).setDelegate(user2.address, true);

      await dataProvenance.connect(user2)["registerDataFor(bytes32,string,address,bytes32)"](
        DATA_HASH_1, "personal", user1.address, STORAGE_REF_1
      );

      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.owner).to.equal(user1.address);
      expect(record.storageRef).to.equal(STORAGE_REF_1);
      expect(await dataProvenance.getDataHashByStorageRef(STORAGE_REF_1)).to.equal(DATA_HASH_1);
    });

    it("should support batch registration with storageRefs", async function () {
      await dataProvenance.connect(user1)["batchRegisterData(bytes32[],string[],bytes32[])"](
        [DATA_HASH_1, DATA_HASH_2],
        ["personal", "financial"],
        [STORAGE_REF_1, STORAGE_REF_2]
      );

      expect(await dataProvenance.getDataHashByStorageRef(STORAGE_REF_1)).to.equal(DATA_HASH_1);
      expect(await dataProvenance.getDataHashByStorageRef(STORAGE_REF_2)).to.equal(DATA_HASH_2);
    });

    it("should support batch registration with zero storageRefs", async function () {
      await dataProvenance.connect(user1)["batchRegisterData(bytes32[],string[],bytes32[])"](
        [DATA_HASH_1, DATA_HASH_2],
        ["personal", "financial"],
        [ethers.ZeroHash, ethers.ZeroHash]
      );

      const record1 = await dataProvenance.getDataRecord(DATA_HASH_1);
      const record2 = await dataProvenance.getDataRecord(DATA_HASH_2);
      expect(record1.storageRef).to.equal(ethers.ZeroHash);
      expect(record2.storageRef).to.equal(ethers.ZeroHash);
    });
  });

  describe("setStorageRef", function () {
    const STORAGE_REF = ethers.keccak256(ethers.toUtf8Bytes("swarm_ref"));

    beforeEach(async function () {
      await dataProvenance.connect(user1).registerData(DATA_HASH_1, "personal");
    });

    it("should allow owner to set storageRef on record without one", async function () {
      await expect(dataProvenance.connect(user1).setStorageRef(DATA_HASH_1, STORAGE_REF))
        .to.emit(dataProvenance, "StorageRefLinked")
        .withArgs(DATA_HASH_1, STORAGE_REF);

      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.storageRef).to.equal(STORAGE_REF);
      expect(await dataProvenance.getDataHashByStorageRef(STORAGE_REF)).to.equal(DATA_HASH_1);
    });

    it("should revert when non-owner tries to set storageRef", async function () {
      await expect(
        dataProvenance.connect(user2).setStorageRef(DATA_HASH_1, STORAGE_REF)
      ).to.be.revertedWith("Not the owner");
    });

    it("should revert when storageRef is already set (immutability)", async function () {
      await dataProvenance.connect(user1).setStorageRef(DATA_HASH_1, STORAGE_REF);

      const anotherRef = ethers.keccak256(ethers.toUtf8Bytes("another_ref"));
      await expect(
        dataProvenance.connect(user1).setStorageRef(DATA_HASH_1, anotherRef)
      ).to.be.revertedWith("Storage ref already set");
    });

    it("should revert for zero storageRef", async function () {
      await expect(
        dataProvenance.connect(user1).setStorageRef(DATA_HASH_1, ethers.ZeroHash)
      ).to.be.revertedWith("Invalid storage ref");
    });

    it("should revert when storageRef equals data hash", async function () {
      await expect(
        dataProvenance.connect(user1).setStorageRef(DATA_HASH_1, DATA_HASH_1)
      ).to.be.revertedWith("Storage ref cannot equal data hash");
    });

    it("should revert when storageRef is already mapped to another hash", async function () {
      await dataProvenance.connect(user1).setStorageRef(DATA_HASH_1, STORAGE_REF);
      await dataProvenance.connect(user1).registerData(DATA_HASH_2, "financial");

      await expect(
        dataProvenance.connect(user1).setStorageRef(DATA_HASH_2, STORAGE_REF)
      ).to.be.revertedWith("Storage ref already mapped");
    });

    it("should work on transformed data records", async function () {
      await dataProvenance.connect(user1).recordTransformation(DATA_HASH_1, DATA_HASH_2, "anonymized");

      // Transformed record has no storageRef
      const before = await dataProvenance.getDataRecord(DATA_HASH_2);
      expect(before.storageRef).to.equal(ethers.ZeroHash);

      // Owner can set it after the fact
      await dataProvenance.connect(user1).setStorageRef(DATA_HASH_2, STORAGE_REF);

      const after = await dataProvenance.getDataRecord(DATA_HASH_2);
      expect(after.storageRef).to.equal(STORAGE_REF);
      expect(await dataProvenance.getDataHashByStorageRef(STORAGE_REF)).to.equal(DATA_HASH_2);
    });

    it("should work on data with non-active status", async function () {
      await dataProvenance.connect(user1).setDataStatus(DATA_HASH_1, 1); // Restricted

      await dataProvenance.connect(user1).setStorageRef(DATA_HASH_1, STORAGE_REF);

      const record = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(record.storageRef).to.equal(STORAGE_REF);
    });

    it("should revert on non-existent data hash", async function () {
      const nonExistent = ethers.keccak256(ethers.toUtf8Bytes("does_not_exist"));
      await expect(
        dataProvenance.connect(user1).setStorageRef(nonExistent, STORAGE_REF)
      ).to.be.revertedWith("Not the owner");
    });

    it("should revert on data registered with storageRef at registration", async function () {
      const STORAGE_REF_2 = ethers.keccak256(ethers.toUtf8Bytes("swarm_ref_2"));
      const ANOTHER_REF = ethers.keccak256(ethers.toUtf8Bytes("another_ref"));

      await dataProvenance.connect(user1)["registerData(bytes32,string,bytes32)"](DATA_HASH_2, "financial", STORAGE_REF_2);

      await expect(
        dataProvenance.connect(user1).setStorageRef(DATA_HASH_2, ANOTHER_REF)
      ).to.be.revertedWith("Storage ref already set");
    });

    it("should work on merged data records", async function () {
      await dataProvenance.connect(user1).registerData(DATA_HASH_2, "financial");

      await dataProvenance.connect(user1).recordMergeTransformation(
        [DATA_HASH_1, DATA_HASH_2], DATA_HASH_3, "joined", "combined"
      );

      // Merged record has no storageRef
      const before = await dataProvenance.getDataRecord(DATA_HASH_3);
      expect(before.storageRef).to.equal(ethers.ZeroHash);

      await dataProvenance.connect(user1).setStorageRef(DATA_HASH_3, STORAGE_REF);

      const after = await dataProvenance.getDataRecord(DATA_HASH_3);
      expect(after.storageRef).to.equal(STORAGE_REF);
      expect(await dataProvenance.getDataHashByStorageRef(STORAGE_REF)).to.equal(DATA_HASH_3);
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

    it("should add transformation link to original record", async function () {
      await dataProvenance.connect(user1).recordTransformation(DATA_HASH_1, DATA_HASH_2, "anonymized");

      const originalRecord = await dataProvenance.getDataRecord(DATA_HASH_1);
      expect(originalRecord.transformationLinks.length).to.equal(1);
      expect(originalRecord.transformationLinks[0].newDataHash).to.equal(DATA_HASH_2);
      expect(originalRecord.transformationLinks[0].description).to.equal("anonymized");
    });

    it("should set transformation parents for reverse lookup", async function () {
      await dataProvenance.connect(user1).recordTransformation(DATA_HASH_1, DATA_HASH_2, "anonymized");

      const parents = await dataProvenance.getTransformationParents(DATA_HASH_2);
      expect(parents.length).to.equal(1);
      expect(parents[0]).to.equal(DATA_HASH_1);
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
      expect(record2.transformationLinks.length).to.equal(1);
      expect(record2.transformationLinks[0].newDataHash).to.equal(DATA_HASH_3);
      expect(record2.transformationLinks[0].description).to.equal("aggregated");

      // Verify parent chain: DATA_HASH_3 → DATA_HASH_2 → DATA_HASH_1
      const parents3 = await dataProvenance.getTransformationParents(DATA_HASH_3);
      expect(parents3.length).to.equal(1);
      expect(parents3[0]).to.equal(DATA_HASH_2);

      const parents2 = await dataProvenance.getTransformationParents(DATA_HASH_2);
      expect(parents2.length).to.equal(1);
      expect(parents2[0]).to.equal(DATA_HASH_1);
    });

    it("should return transformation links via getTransformationLinks", async function () {
      await dataProvenance.connect(user1).recordTransformation(DATA_HASH_1, DATA_HASH_2, "anonymized");

      const links = await dataProvenance.getTransformationLinks(DATA_HASH_1);
      expect(links.length).to.equal(1);
      expect(links[0].newDataHash).to.equal(DATA_HASH_2);
      expect(links[0].description).to.equal("anonymized");
    });

    it("should return child hashes via getChildHashes", async function () {
      await dataProvenance.connect(user1).recordTransformation(DATA_HASH_1, DATA_HASH_2, "anonymized");

      const children = await dataProvenance.getChildHashes(DATA_HASH_1);
      expect(children.length).to.equal(1);
      expect(children[0]).to.equal(DATA_HASH_2);
    });

    it("should return empty parents for root data", async function () {
      const parents = await dataProvenance.getTransformationParents(DATA_HASH_1);
      expect(parents.length).to.equal(0);
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

  describe("recordMergeTransformation", function () {
    const DATA_HASH_4 = ethers.keccak256(ethers.toUtf8Bytes("data4"));

    beforeEach(async function () {
      await dataProvenance.connect(user1).registerData(DATA_HASH_1, "personal");
      await dataProvenance.connect(user1).registerData(DATA_HASH_2, "financial");
    });

    it("should merge two sources into a new record", async function () {
      await expect(
        dataProvenance.connect(user1).recordMergeTransformation(
          [DATA_HASH_1, DATA_HASH_2],
          DATA_HASH_3,
          "joined datasets",
          "combined"
        )
      )
        .to.emit(dataProvenance, "DataMerged")
        .withArgs(DATA_HASH_3, [DATA_HASH_1, DATA_HASH_2], "joined datasets");
    });

    it("should create new record with specified data type", async function () {
      await dataProvenance.connect(user1).recordMergeTransformation(
        [DATA_HASH_1, DATA_HASH_2],
        DATA_HASH_3,
        "joined datasets",
        "combined"
      );

      const record = await dataProvenance.getDataRecord(DATA_HASH_3);
      expect(record.owner).to.equal(user1.address);
      expect(record.dataType).to.equal("combined");
      expect(record.status).to.equal(0); // Active
    });

    it("should add forward links from each source", async function () {
      await dataProvenance.connect(user1).recordMergeTransformation(
        [DATA_HASH_1, DATA_HASH_2],
        DATA_HASH_3,
        "joined datasets",
        "combined"
      );

      const links1 = await dataProvenance.getTransformationLinks(DATA_HASH_1);
      expect(links1.length).to.equal(1);
      expect(links1[0].newDataHash).to.equal(DATA_HASH_3);

      const links2 = await dataProvenance.getTransformationLinks(DATA_HASH_2);
      expect(links2.length).to.equal(1);
      expect(links2[0].newDataHash).to.equal(DATA_HASH_3);
    });

    it("should set multiple parents for reverse lookup", async function () {
      await dataProvenance.connect(user1).recordMergeTransformation(
        [DATA_HASH_1, DATA_HASH_2],
        DATA_HASH_3,
        "joined datasets",
        "combined"
      );

      const parents = await dataProvenance.getTransformationParents(DATA_HASH_3);
      expect(parents.length).to.equal(2);
      expect(parents[0]).to.equal(DATA_HASH_1);
      expect(parents[1]).to.equal(DATA_HASH_2);
    });

    it("should support merge with more than 2 sources", async function () {
      await dataProvenance.connect(user1).registerData(DATA_HASH_3, "medical");

      await dataProvenance.connect(user1).recordMergeTransformation(
        [DATA_HASH_1, DATA_HASH_2, DATA_HASH_3],
        DATA_HASH_4,
        "three-way merge",
        "aggregate"
      );

      const parents = await dataProvenance.getTransformationParents(DATA_HASH_4);
      expect(parents.length).to.equal(3);

      // Each source should have a forward link
      for (const hash of [DATA_HASH_1, DATA_HASH_2, DATA_HASH_3]) {
        const children = await dataProvenance.getChildHashes(hash);
        expect(children).to.include(DATA_HASH_4);
      }
    });

    it("should revert with fewer than 2 sources", async function () {
      await expect(
        dataProvenance.connect(user1).recordMergeTransformation(
          [DATA_HASH_1],
          DATA_HASH_3,
          "not a merge",
          "combined"
        )
      ).to.be.revertedWith("Merge requires at least 2 sources");
    });

    it("should revert with empty sources", async function () {
      await expect(
        dataProvenance.connect(user1).recordMergeTransformation(
          [],
          DATA_HASH_3,
          "not a merge",
          "combined"
        )
      ).to.be.revertedWith("Merge requires at least 2 sources");
    });

    it("should revert when caller does not own all sources", async function () {
      await dataProvenance.connect(user2).registerData(DATA_HASH_3, "other");

      await expect(
        dataProvenance.connect(user1).recordMergeTransformation(
          [DATA_HASH_1, DATA_HASH_3],
          DATA_HASH_4,
          "merge",
          "combined"
        )
      ).to.be.revertedWith("Not the owner of source data");
    });

    it("should revert when a source is not active", async function () {
      await dataProvenance.connect(user1).setDataStatus(DATA_HASH_2, 1); // Restricted

      await expect(
        dataProvenance.connect(user1).recordMergeTransformation(
          [DATA_HASH_1, DATA_HASH_2],
          DATA_HASH_3,
          "merge",
          "combined"
        )
      ).to.be.revertedWith("Source data is not active");
    });

    it("should revert when new hash already exists", async function () {
      await dataProvenance.connect(user1).registerData(DATA_HASH_3, "existing");

      await expect(
        dataProvenance.connect(user1).recordMergeTransformation(
          [DATA_HASH_1, DATA_HASH_2],
          DATA_HASH_3,
          "merge",
          "combined"
        )
      ).to.be.revertedWith("New data hash already exists");
    });

    it("should revert with duplicate source hashes", async function () {
      await expect(
        dataProvenance.connect(user1).recordMergeTransformation(
          [DATA_HASH_1, DATA_HASH_1],
          DATA_HASH_3,
          "merge",
          "combined"
        )
      ).to.be.revertedWith("Duplicate source hash");
    });

    it("should revert with empty transformation description", async function () {
      await expect(
        dataProvenance.connect(user1).recordMergeTransformation(
          [DATA_HASH_1, DATA_HASH_2],
          DATA_HASH_3,
          "",
          "combined"
        )
      ).to.be.revertedWith("Transformation cannot be empty");
    });

    it("should revert with empty data type", async function () {
      await expect(
        dataProvenance.connect(user1).recordMergeTransformation(
          [DATA_HASH_1, DATA_HASH_2],
          DATA_HASH_3,
          "merge",
          ""
        )
      ).to.be.revertedWith("Data type cannot be empty");
    });

    it("should allow chaining: merge then transform", async function () {
      // Merge DATA_HASH_1 + DATA_HASH_2 → DATA_HASH_3
      await dataProvenance.connect(user1).recordMergeTransformation(
        [DATA_HASH_1, DATA_HASH_2],
        DATA_HASH_3,
        "joined",
        "combined"
      );

      // Then transform DATA_HASH_3 → DATA_HASH_4
      await dataProvenance.connect(user1).recordTransformation(DATA_HASH_3, DATA_HASH_4, "anonymized");

      // DATA_HASH_4 has single parent DATA_HASH_3
      const parents4 = await dataProvenance.getTransformationParents(DATA_HASH_4);
      expect(parents4.length).to.equal(1);
      expect(parents4[0]).to.equal(DATA_HASH_3);

      // DATA_HASH_3 has two parents from the merge
      const parents3 = await dataProvenance.getTransformationParents(DATA_HASH_3);
      expect(parents3.length).to.equal(2);
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
