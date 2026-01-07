import { expect } from "chai";
import { ethers } from "hardhat";
import { ConsentReceipt } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ConsentReceipt", function () {
  let consentReceipt: ConsentReceipt;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const ConsentReceiptFactory = await ethers.getContractFactory("ConsentReceipt");
    consentReceipt = await ConsentReceiptFactory.deploy();
    await consentReceipt.waitForDeployment();
  });

  describe("giveConsent", function () {
    it("should allow a user to give consent for a purpose", async function () {
      // Using overloaded function with just purpose (no expiry)
      await expect(consentReceipt.connect(user1)["giveConsent(string)"]("marketing"))
        .to.emit(consentReceipt, "ConsentGiven");
    });

    it("should allow consent with expiry time", async function () {
      const expiryTime = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
      await expect(
        consentReceipt.connect(user1)["giveConsent(string,uint256)"]("analytics", expiryTime)
      ).to.emit(consentReceipt, "ConsentGiven");
    });

    it("should store consent correctly", async function () {
      await consentReceipt.connect(user1)["giveConsent(string)"]("analytics");

      const consents = await consentReceipt.getUserConsents(user1.address);
      expect(consents.length).to.equal(1);
      expect(consents[0].user).to.equal(user1.address);
      expect(consents[0].purpose).to.equal("analytics");
      expect(consents[0].isValid).to.be.true;
      expect(consents[0].expiryTime).to.equal(0); // No expiry
    });

    it("should allow multiple consents for same user", async function () {
      await consentReceipt.connect(user1)["giveConsent(string)"]("marketing");
      await consentReceipt.connect(user1)["giveConsent(string)"]("analytics");
      await consentReceipt.connect(user1)["giveConsent(string)"]("research");

      const consents = await consentReceipt.getUserConsents(user1.address);
      expect(consents.length).to.equal(3);
    });

    it("should allow same purpose from different users", async function () {
      await consentReceipt.connect(user1)["giveConsent(string)"]("marketing");
      await consentReceipt.connect(user2)["giveConsent(string)"]("marketing");

      expect(await consentReceipt.getConsentStatus(user1.address, "marketing")).to.be.true;
      expect(await consentReceipt.getConsentStatus(user2.address, "marketing")).to.be.true;
    });

    it("should revert for empty purpose", async function () {
      await expect(
        consentReceipt.connect(user1)["giveConsent(string)"]("")
      ).to.be.revertedWith("Purpose cannot be empty");
    });

    it("should revert for purpose too long", async function () {
      const longPurpose = "a".repeat(257);
      await expect(
        consentReceipt.connect(user1)["giveConsent(string)"](longPurpose)
      ).to.be.revertedWith("Purpose too long");
    });

    it("should revert for expiry in the past", async function () {
      const pastExpiry = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      await expect(
        consentReceipt.connect(user1)["giveConsent(string,uint256)"]("test", pastExpiry)
      ).to.be.revertedWith("Expiry must be in future");
    });
  });

  describe("revokeConsent", function () {
    beforeEach(async function () {
      await consentReceipt.connect(user1)["giveConsent(string)"]("marketing");
      await consentReceipt.connect(user1)["giveConsent(string)"]("analytics");
    });

    it("should allow user to revoke their consent", async function () {
      await expect(consentReceipt.connect(user1).revokeConsent(0))
        .to.emit(consentReceipt, "ConsentRevoked");
    });

    it("should mark consent as invalid after revocation", async function () {
      await consentReceipt.connect(user1).revokeConsent(0);

      const consents = await consentReceipt.getUserConsents(user1.address);
      expect(consents[0].isValid).to.be.false;
      expect(consents[1].isValid).to.be.true;
    });

    it("should revert when revoking already revoked consent", async function () {
      await consentReceipt.connect(user1).revokeConsent(0);

      await expect(consentReceipt.connect(user1).revokeConsent(0))
        .to.be.revertedWith("Consent already revoked");
    });

    it("should revert when revoking with invalid index", async function () {
      await expect(consentReceipt.connect(user1).revokeConsent(99))
        .to.be.revertedWith("Invalid consent index");
    });

    it("should not affect other users consents", async function () {
      await consentReceipt.connect(user2)["giveConsent(string)"]("marketing");
      await consentReceipt.connect(user1).revokeConsent(0);

      expect(await consentReceipt.getConsentStatus(user2.address, "marketing")).to.be.true;
    });
  });

  describe("getConsentStatus", function () {
    it("should return true for valid consent", async function () {
      await consentReceipt.connect(user1)["giveConsent(string)"]("marketing");
      expect(await consentReceipt.getConsentStatus(user1.address, "marketing")).to.be.true;
    });

    it("should return false for non-existent consent", async function () {
      expect(await consentReceipt.getConsentStatus(user1.address, "marketing")).to.be.false;
    });

    it("should return false for revoked consent", async function () {
      await consentReceipt.connect(user1)["giveConsent(string)"]("marketing");
      await consentReceipt.connect(user1).revokeConsent(0);

      expect(await consentReceipt.getConsentStatus(user1.address, "marketing")).to.be.false;
    });

    it("should return true if at least one consent for purpose is valid", async function () {
      await consentReceipt.connect(user1)["giveConsent(string)"]("marketing");
      await consentReceipt.connect(user1)["giveConsent(string)"]("marketing"); // duplicate
      await consentReceipt.connect(user1).revokeConsent(0);

      // Second consent still valid
      expect(await consentReceipt.getConsentStatus(user1.address, "marketing")).to.be.true;
    });

    it("should return false for expired consent", async function () {
      // Create consent that expires in 100 seconds
      const block = await ethers.provider.getBlock("latest");
      const expiryTime = block!.timestamp + 100;
      await consentReceipt.connect(user1)["giveConsent(string,uint256)"]("expiring", expiryTime);

      // Immediately should be valid
      expect(await consentReceipt.getConsentStatus(user1.address, "expiring")).to.be.true;

      // Fast forward time past expiry
      await ethers.provider.send("evm_increaseTime", [150]);
      await ethers.provider.send("evm_mine", []);

      // Should now be invalid
      expect(await consentReceipt.getConsentStatus(user1.address, "expiring")).to.be.false;
    });
  });

  describe("getUserConsents", function () {
    it("should return empty array for user with no consents", async function () {
      const consents = await consentReceipt.getUserConsents(user1.address);
      expect(consents.length).to.equal(0);
    });

    it("should return all consents including revoked ones", async function () {
      await consentReceipt.connect(user1)["giveConsent(string)"]("marketing");
      await consentReceipt.connect(user1)["giveConsent(string)"]("analytics");
      await consentReceipt.connect(user1).revokeConsent(0);

      const consents = await consentReceipt.getUserConsents(user1.address);
      expect(consents.length).to.equal(2);
      expect(consents[0].isValid).to.be.false;
      expect(consents[1].isValid).to.be.true;
    });
  });

  describe("Pagination", function () {
    beforeEach(async function () {
      for (let i = 0; i < 10; i++) {
        await consentReceipt.connect(user1)["giveConsent(string)"](`purpose_${i}`);
      }
    });

    it("should return paginated results", async function () {
      const page1 = await consentReceipt.getUserConsentsPaginated(user1.address, 0, 3);
      expect(page1.length).to.equal(3);
      expect(page1[0].purpose).to.equal("purpose_0");

      const page2 = await consentReceipt.getUserConsentsPaginated(user1.address, 3, 3);
      expect(page2.length).to.equal(3);
      expect(page2[0].purpose).to.equal("purpose_3");
    });

    it("should handle offset beyond array length", async function () {
      const result = await consentReceipt.getUserConsentsPaginated(user1.address, 100, 10);
      expect(result.length).to.equal(0);
    });

    it("should handle limit exceeding remaining items", async function () {
      const result = await consentReceipt.getUserConsentsPaginated(user1.address, 8, 10);
      expect(result.length).to.equal(2); // Only 2 items left
    });

    it("should return correct count", async function () {
      const count = await consentReceipt.getUserConsentsCount(user1.address);
      expect(count).to.equal(10);
    });
  });
});
