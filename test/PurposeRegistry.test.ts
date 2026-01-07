import { expect } from "chai";
import { ethers } from "hardhat";
import { PurposeRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PurposeRegistry", function () {
    let registry: PurposeRegistry;
    let admin: SignerWithAddress;
    let user: SignerWithAddress;

    beforeEach(async function () {
        [admin, user] = await ethers.getSigners();

        const RegistryFactory = await ethers.getContractFactory("PurposeRegistry");
        registry = await RegistryFactory.deploy();
        await registry.waitForDeployment();
    });

    describe("Core purposes", function () {
        it("should have 10 core purposes registered", async function () {
            expect(await registry.getPurposeCount()).to.equal(10);
        });

        it("should have valid SERVICE_PROVISION", async function () {
            const purposeId = await registry.SERVICE_PROVISION();
            expect(await registry.isPurposeValid(purposeId)).to.be.true;

            const info = await registry.getPurpose(purposeId);
            expect(info.name).to.equal("Service Provision");
        });

        it("should have valid DIRECT_MARKETING", async function () {
            const purposeId = await registry.DIRECT_MARKETING();
            expect(await registry.isPurposeValid(purposeId)).to.be.true;
        });
    });

    describe("registerPurpose", function () {
        it("should allow admin to register new purpose", async function () {
            await expect(registry.connect(admin).registerPurpose("Custom Purpose", "Custom description"))
                .to.emit(registry, "PurposeRegistered");

            expect(await registry.getPurposeCount()).to.equal(11);
        });

        it("should revert when non-admin registers", async function () {
            await expect(
                registry.connect(user).registerPurpose("Unauthorized", "desc")
            ).to.be.revertedWith("Not admin");
        });

        it("should revert for duplicate purpose", async function () {
            await registry.connect(admin).registerPurpose("New Purpose", "desc");

            await expect(
                registry.connect(admin).registerPurpose("New Purpose", "different desc")
            ).to.be.revertedWith("Purpose already exists");
        });
    });

    describe("deactivatePurpose", function () {
        it("should deactivate purpose", async function () {
            const purposeId = await registry.SERVICE_PROVISION();

            await expect(registry.connect(admin).deactivatePurpose(purposeId))
                .to.emit(registry, "PurposeDeactivated");

            expect(await registry.isPurposeValid(purposeId)).to.be.false;
        });

        it("should revert when deactivating inactive purpose", async function () {
            const purposeId = await registry.SERVICE_PROVISION();
            await registry.connect(admin).deactivatePurpose(purposeId);

            await expect(
                registry.connect(admin).deactivatePurpose(purposeId)
            ).to.be.revertedWith("Purpose not active");
        });
    });

    describe("reactivatePurpose", function () {
        it("should reactivate purpose", async function () {
            const purposeId = await registry.SERVICE_PROVISION();
            await registry.connect(admin).deactivatePurpose(purposeId);

            await expect(registry.connect(admin).reactivatePurpose(purposeId))
                .to.emit(registry, "PurposeReactivated");

            expect(await registry.isPurposeValid(purposeId)).to.be.true;
        });
    });

    describe("getPurposeIdByName", function () {
        it("should return correct hash", async function () {
            const expectedHash = ethers.keccak256(ethers.toUtf8Bytes("ServiceProvision"));
            expect(await registry.getPurposeIdByName("ServiceProvision")).to.equal(expectedHash);
        });
    });

    describe("getAllPurposes", function () {
        it("should return all purpose IDs", async function () {
            const purposes = await registry.getAllPurposes();
            expect(purposes.length).to.equal(10);
        });
    });
});
