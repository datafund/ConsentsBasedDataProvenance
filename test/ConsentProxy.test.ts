import { expect } from "chai";
import { ethers } from "hardhat";
import { ConsentProxy } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ConsentProxy", function () {
    let consentProxy: ConsentProxy;
    let delegator: SignerWithAddress;
    let delegate: SignerWithAddress;
    let other: SignerWithAddress;

    beforeEach(async function () {
        [delegator, delegate, other] = await ethers.getSigners();

        const ConsentProxyFactory = await ethers.getContractFactory("ConsentProxy");
        consentProxy = await ConsentProxyFactory.deploy();
        await consentProxy.waitForDeployment();
    });

    describe("grantDelegation", function () {
        it("should grant delegation with all purposes", async function () {
            const block = await ethers.provider.getBlock("latest");
            const validUntil = block!.timestamp + 86400 * 30;

            await expect(consentProxy.connect(delegator).grantDelegation(delegate.address, validUntil, []))
                .to.emit(consentProxy, "DelegationGranted")
                .withArgs(delegator.address, delegate.address, validUntil);
        });

        it("should grant delegation with specific purposes", async function () {
            const block = await ethers.provider.getBlock("latest");
            const validUntil = block!.timestamp + 86400 * 30;

            await consentProxy.connect(delegator).grantDelegation(delegate.address, validUntil, ["analytics", "marketing"]);

            expect(await consentProxy.canActFor(delegator.address, delegate.address, "analytics")).to.be.true;
            expect(await consentProxy.canActFor(delegator.address, delegate.address, "marketing")).to.be.true;
            expect(await consentProxy.canActFor(delegator.address, delegate.address, "research")).to.be.false;
        });

        it("should revert for self-delegation", async function () {
            const block = await ethers.provider.getBlock("latest");
            const validUntil = block!.timestamp + 86400 * 30;
            await expect(
                consentProxy.connect(delegator).grantDelegation(delegator.address, validUntil, [])
            ).to.be.revertedWith("Cannot delegate to self");
        });

        it("should revert for expired validity", async function () {
            const block = await ethers.provider.getBlock("latest");
            const pastTime = block!.timestamp - 3600;
            await expect(
                consentProxy.connect(delegator).grantDelegation(delegate.address, pastTime, [])
            ).to.be.revertedWith("Invalid expiry");
        });
    });

    describe("revokeDelegation", function () {
        beforeEach(async function () {
            const block = await ethers.provider.getBlock("latest");
            const validUntil = block!.timestamp + 86400 * 30;
            await consentProxy.connect(delegator).grantDelegation(delegate.address, validUntil, []);
        });

        it("should revoke delegation", async function () {
            await expect(consentProxy.connect(delegator).revokeDelegation(delegate.address))
                .to.emit(consentProxy, "DelegationRevoked");

            expect(await consentProxy.isDelegationValid(delegator.address, delegate.address)).to.be.false;
        });
    });

    describe("canActFor", function () {
        it("should return false for expired delegation", async function () {
            const block = await ethers.provider.getBlock("latest");
            const validUntil = block!.timestamp + 100;

            await consentProxy.connect(delegator).grantDelegation(delegate.address, validUntil, []);

            await ethers.provider.send("evm_increaseTime", [150]);
            await ethers.provider.send("evm_mine", []);

            expect(await consentProxy.canActFor(delegator.address, delegate.address, "any")).to.be.false;
        });

        it("should return true for valid delegation with all purposes", async function () {
            const block = await ethers.provider.getBlock("latest");
            const validUntil = block!.timestamp + 86400 * 30;
            await consentProxy.connect(delegator).grantDelegation(delegate.address, validUntil, []);

            expect(await consentProxy.canActFor(delegator.address, delegate.address, "anything")).to.be.true;
        });
    });

    describe("getDelegates and getDelegators", function () {
        it("should track delegates", async function () {
            const block = await ethers.provider.getBlock("latest");
            const validUntil = block!.timestamp + 86400 * 30;
            await consentProxy.connect(delegator).grantDelegation(delegate.address, validUntil, []);

            const delegates = await consentProxy.getDelegates(delegator.address);
            expect(delegates).to.include(delegate.address);

            const delegators = await consentProxy.getDelegators(delegate.address);
            expect(delegators).to.include(delegator.address);
        });
    });
});
