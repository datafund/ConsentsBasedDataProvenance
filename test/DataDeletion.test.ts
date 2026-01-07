import { expect } from "chai";
import { ethers } from "hardhat";
import { DataDeletion, DataProvenance } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("DataDeletion", function () {
    let dataDeletion: DataDeletion;
    let dataProvenance: DataProvenance;
    let owner: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;

    const DATA_HASH_1 = ethers.keccak256(ethers.toUtf8Bytes("user_data"));

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
        dataProvenance = await DataProvenanceFactory.deploy();
        await dataProvenance.waitForDeployment();

        const DataDeletionFactory = await ethers.getContractFactory("DataDeletion");
        dataDeletion = await DataDeletionFactory.deploy(await dataProvenance.getAddress());
        await dataDeletion.waitForDeployment();

        await dataProvenance.connect(user1).registerData(DATA_HASH_1, "personal");
    });

    describe("requestDeletion", function () {
        it("should allow owner to request deletion", async function () {
            await expect(dataDeletion.connect(user1).requestDeletion(DATA_HASH_1, "GDPR request"))
                .to.emit(dataDeletion, "DeletionRequested")
                .to.emit(dataDeletion, "DeletionCompleted");
        });

        it("should generate valid deletion proof", async function () {
            await dataDeletion.connect(user1).requestDeletion(DATA_HASH_1, "User request");

            const [deleted, proof] = await dataDeletion.verifyDeletion(DATA_HASH_1);
            expect(deleted).to.be.true;
            expect(proof.requester).to.equal(user1.address);
            expect(proof.proofHash).to.not.equal(ethers.ZeroHash);
        });

        it("should revert when non-owner requests deletion", async function () {
            await expect(
                dataDeletion.connect(user2).requestDeletion(DATA_HASH_1, "Unauthorized")
            ).to.be.revertedWith("Not the data owner");
        });

        it("should revert when deleting already deleted data", async function () {
            await dataDeletion.connect(user1).requestDeletion(DATA_HASH_1, "First request");

            await expect(
                dataDeletion.connect(user1).requestDeletion(DATA_HASH_1, "Second request")
            ).to.be.revertedWith("Already deleted");
        });
    });

    describe("verifyDeletion", function () {
        it("should return false for non-deleted data", async function () {
            const [deleted] = await dataDeletion.verifyDeletion(DATA_HASH_1);
            expect(deleted).to.be.false;
        });

        it("should return full proof for deleted data", async function () {
            await dataDeletion.connect(user1).requestDeletion(DATA_HASH_1, "Test reason");

            const [deleted, proof] = await dataDeletion.verifyDeletion(DATA_HASH_1);
            expect(deleted).to.be.true;
            expect(proof.reason).to.equal("Test reason");
        });
    });

    describe("getUserDeletionRequests", function () {
        it("should track user deletion requests", async function () {
            const DATA_HASH_2 = ethers.keccak256(ethers.toUtf8Bytes("more_data"));
            await dataProvenance.connect(user1).registerData(DATA_HASH_2, "personal");

            await dataDeletion.connect(user1).requestDeletion(DATA_HASH_1, "Request 1");
            await dataDeletion.connect(user1).requestDeletion(DATA_HASH_2, "Request 2");

            const requests = await dataDeletion.getUserDeletionRequests(user1.address);
            expect(requests.length).to.equal(2);
        });
    });

    describe("isDataAccessible", function () {
        it("should return true for non-deleted data", async function () {
            expect(await dataDeletion.isDataAccessible(DATA_HASH_1)).to.be.true;
        });

        it("should return false for deleted data", async function () {
            await dataDeletion.connect(user1).requestDeletion(DATA_HASH_1, "Delete");
            expect(await dataDeletion.isDataAccessible(DATA_HASH_1)).to.be.false;
        });
    });
});
