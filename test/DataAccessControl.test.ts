import { expect } from "chai";
import { ethers } from "hardhat";
import { DataAccessControl, DataProvenance } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("DataAccessControl", function () {
    let accessControl: DataAccessControl;
    let dataProvenance: DataProvenance;
    let owner: SignerWithAddress;
    let grantee: SignerWithAddress;
    let other: SignerWithAddress;

    const DATA_HASH = ethers.keccak256(ethers.toUtf8Bytes("test_data"));

    beforeEach(async function () {
        [owner, grantee, other] = await ethers.getSigners();

        const DataProvenanceFactory = await ethers.getContractFactory("DataProvenance");
        dataProvenance = await DataProvenanceFactory.deploy();
        await dataProvenance.waitForDeployment();

        const AccessControlFactory = await ethers.getContractFactory("DataAccessControl");
        accessControl = await AccessControlFactory.deploy(await dataProvenance.getAddress());
        await accessControl.waitForDeployment();

        await dataProvenance.connect(owner).registerData(DATA_HASH, "personal");
    });

    describe("grantAccess", function () {
        it("should grant access to grantee", async function () {
            const block = await ethers.provider.getBlock("latest");
            const validUntil = block!.timestamp + 86400 * 30;

            await expect(accessControl.connect(owner).grantAccess(DATA_HASH, grantee.address, 1, validUntil, ethers.ZeroHash))
                .to.emit(accessControl, "AccessGranted")
                .withArgs(DATA_HASH, grantee.address, 1, validUntil);
        });

        it("should revert when non-owner grants access", async function () {
            const block = await ethers.provider.getBlock("latest");
            const validUntil = block!.timestamp + 86400 * 30;

            await expect(
                accessControl.connect(other).grantAccess(DATA_HASH, grantee.address, 1, validUntil, ethers.ZeroHash)
            ).to.be.revertedWith("Not the data owner");
        });

        it("should revert for self-grant", async function () {
            const block = await ethers.provider.getBlock("latest");
            const validUntil = block!.timestamp + 86400 * 30;

            await expect(
                accessControl.connect(owner).grantAccess(DATA_HASH, owner.address, 1, validUntil, ethers.ZeroHash)
            ).to.be.revertedWith("Cannot grant to self");
        });
    });

    describe("checkAccess", function () {
        beforeEach(async function () {
            const block = await ethers.provider.getBlock("latest");
            const validUntil = block!.timestamp + 86400 * 30;
            await accessControl.connect(owner).grantAccess(DATA_HASH, grantee.address, 2, validUntil, ethers.ZeroHash);
        });

        it("should return true for sufficient access level", async function () {
            expect(await accessControl.checkAccess(DATA_HASH, grantee.address, 1)).to.be.true;
            expect(await accessControl.checkAccess(DATA_HASH, grantee.address, 2)).to.be.true;
        });

        it("should return false for insufficient access level", async function () {
            expect(await accessControl.checkAccess(DATA_HASH, grantee.address, 3)).to.be.false;
        });

        it("should return false for expired access", async function () {
            await ethers.provider.send("evm_increaseTime", [86400 * 31]);
            await ethers.provider.send("evm_mine", []);

            expect(await accessControl.checkAccess(DATA_HASH, grantee.address, 1)).to.be.false;
        });
    });

    describe("revokeAccess", function () {
        beforeEach(async function () {
            const block = await ethers.provider.getBlock("latest");
            const validUntil = block!.timestamp + 86400 * 30;
            await accessControl.connect(owner).grantAccess(DATA_HASH, grantee.address, 1, validUntil, ethers.ZeroHash);
        });

        it("should revoke access", async function () {
            await expect(accessControl.connect(owner).revokeAccess(DATA_HASH, grantee.address))
                .to.emit(accessControl, "AccessRevoked");

            expect(await accessControl.isAccessValid(DATA_HASH, grantee.address)).to.be.false;
        });
    });

    describe("changeAccessLevel", function () {
        beforeEach(async function () {
            const block = await ethers.provider.getBlock("latest");
            const validUntil = block!.timestamp + 86400 * 30;
            await accessControl.connect(owner).grantAccess(DATA_HASH, grantee.address, 1, validUntil, ethers.ZeroHash);
        });

        it("should change access level", async function () {
            await expect(accessControl.connect(owner).changeAccessLevel(DATA_HASH, grantee.address, 3))
                .to.emit(accessControl, "AccessLevelChanged")
                .withArgs(DATA_HASH, grantee.address, 1, 3);

            expect(await accessControl.checkAccess(DATA_HASH, grantee.address, 3)).to.be.true;
        });
    });
});
