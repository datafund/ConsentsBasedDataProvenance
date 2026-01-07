import { expect } from "chai";
import { ethers } from "hardhat";
import { KantaraConsentReceipt } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("KantaraConsentReceipt", function () {
  let kantaraConsent: KantaraConsentReceipt;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let dataController: SignerWithAddress;

  const POLICY_URL = "https://example.com/privacy";
  const PI_CATEGORIES = [
    ethers.keccak256(ethers.toUtf8Bytes("email")),
    ethers.keccak256(ethers.toUtf8Bytes("name")),
  ];

  // Enum values from contract
  const Purpose = {
    ServiceProvision: 0,
    DirectMarketing: 16,
    ScientificResearch: 27,
  };

  const ConsentType = {
    Express: 0,
    ExplicitAffirmative: 4,
    DigitalConsent: 10,
  };

  beforeEach(async function () {
    [owner, user1, user2, dataController] = await ethers.getSigners();
    const KantaraConsentFactory = await ethers.getContractFactory("KantaraConsentReceipt");
    kantaraConsent = await KantaraConsentFactory.deploy();
    await kantaraConsent.waitForDeployment();
  });

  describe("giveConsent", function () {
    it("should create a consent receipt with all fields", async function () {
      const expiryTime = Math.floor(Date.now() / 1000) + 86400 * 365; // 1 year

      const tx = await kantaraConsent.connect(user1).giveConsent(
        dataController.address,
        [Purpose.ServiceProvision, Purpose.DirectMarketing],
        PI_CATEGORIES,
        ConsentType.ExplicitAffirmative,
        expiryTime,
        false,
        POLICY_URL
      );

      await expect(tx).to.emit(kantaraConsent, "ConsentGiven");
    });

    it("should store receipt correctly", async function () {
      const expiryTime = Math.floor(Date.now() / 1000) + 86400 * 365;

      await kantaraConsent.connect(user1).giveConsent(
        dataController.address,
        [Purpose.ServiceProvision],
        PI_CATEGORIES,
        ConsentType.Express,
        expiryTime,
        true,
        POLICY_URL
      );

      const receipts = await kantaraConsent.getUserReceipts(user1.address);
      expect(receipts.length).to.equal(1);

      const storedReceipt = await kantaraConsent.getConsentReceipt(receipts[0]);
      expect(storedReceipt.dataSubject).to.equal(user1.address);
      expect(storedReceipt.dataController).to.equal(dataController.address);
      expect(storedReceipt.thirdPartyDisclosure).to.be.true;
      expect(storedReceipt.policyUrl).to.equal(POLICY_URL);
    });

    it("should generate unique receipt IDs with nonce", async function () {
      const expiryTime = Math.floor(Date.now() / 1000) + 86400 * 365;

      // Create two consents with same controller
      await kantaraConsent.connect(user1).giveConsent(
        dataController.address,
        [Purpose.ServiceProvision],
        PI_CATEGORIES,
        ConsentType.Express,
        expiryTime,
        false,
        POLICY_URL
      );

      await kantaraConsent.connect(user1).giveConsent(
        dataController.address,
        [Purpose.DirectMarketing],
        PI_CATEGORIES,
        ConsentType.DigitalConsent,
        expiryTime,
        true,
        POLICY_URL
      );

      const receipts = await kantaraConsent.getUserReceipts(user1.address);
      expect(receipts.length).to.equal(2);
      // With nonce, receipt IDs should be different
      expect(receipts[0]).to.not.equal(receipts[1]);
    });

    it("should track nonce correctly", async function () {
      expect(await kantaraConsent.getUserNonce(user1.address)).to.equal(0);

      const expiryTime = Math.floor(Date.now() / 1000) + 86400 * 365;
      await kantaraConsent.connect(user1).giveConsent(
        dataController.address,
        [Purpose.ServiceProvision],
        PI_CATEGORIES,
        ConsentType.Express,
        expiryTime,
        false,
        POLICY_URL
      );

      expect(await kantaraConsent.getUserNonce(user1.address)).to.equal(1);
    });

    it("should revert for invalid data controller", async function () {
      await expect(
        kantaraConsent.connect(user1).giveConsent(
          ethers.ZeroAddress,
          [Purpose.ServiceProvision],
          PI_CATEGORIES,
          ConsentType.Express,
          0,
          false,
          POLICY_URL
        )
      ).to.be.revertedWith("Invalid data controller");
    });

    it("should revert for empty purposes", async function () {
      await expect(
        kantaraConsent.connect(user1).giveConsent(
          dataController.address,
          [],
          PI_CATEGORIES,
          ConsentType.Express,
          0,
          false,
          POLICY_URL
        )
      ).to.be.revertedWith("At least one purpose required");
    });

    it("should revert for too many purposes", async function () {
      const manyPurposes = Array(21).fill(Purpose.ServiceProvision);
      await expect(
        kantaraConsent.connect(user1).giveConsent(
          dataController.address,
          manyPurposes,
          PI_CATEGORIES,
          ConsentType.Express,
          0,
          false,
          POLICY_URL
        )
      ).to.be.revertedWith("Too many purposes");
    });

    it("should revert for policy URL too long", async function () {
      const longUrl = "https://example.com/" + "a".repeat(500);
      await expect(
        kantaraConsent.connect(user1).giveConsent(
          dataController.address,
          [Purpose.ServiceProvision],
          PI_CATEGORIES,
          ConsentType.Express,
          0,
          false,
          longUrl
        )
      ).to.be.revertedWith("Policy URL too long");
    });

    it("should revert for expiry in the past", async function () {
      const pastExpiry = Math.floor(Date.now() / 1000) - 3600;
      await expect(
        kantaraConsent.connect(user1).giveConsent(
          dataController.address,
          [Purpose.ServiceProvision],
          PI_CATEGORIES,
          ConsentType.Express,
          pastExpiry,
          false,
          POLICY_URL
        )
      ).to.be.revertedWith("Expiry must be in future");
    });
  });

  describe("revokeConsent", function () {
    let receiptId: string;

    beforeEach(async function () {
      const expiryTime = Math.floor(Date.now() / 1000) + 86400 * 365;

      await kantaraConsent.connect(user1).giveConsent(
        dataController.address,
        [Purpose.ServiceProvision],
        PI_CATEGORIES,
        ConsentType.Express,
        expiryTime,
        false,
        POLICY_URL
      );

      const receipts = await kantaraConsent.getUserReceipts(user1.address);
      receiptId = receipts[0];
    });

    it("should allow owner to revoke consent", async function () {
      await expect(kantaraConsent.connect(user1).revokeConsent(receiptId))
        .to.emit(kantaraConsent, "ConsentRevoked")
        .withArgs(receiptId, user1.address);
    });

    it("should remove receipt from user receipts", async function () {
      await kantaraConsent.connect(user1).revokeConsent(receiptId);

      const receipts = await kantaraConsent.getUserReceipts(user1.address);
      expect(receipts.length).to.equal(0);
    });

    it("should delete receipt data", async function () {
      await kantaraConsent.connect(user1).revokeConsent(receiptId);

      const storedReceipt = await kantaraConsent.getConsentReceipt(receiptId);
      expect(storedReceipt.dataSubject).to.equal(ethers.ZeroAddress);
    });

    it("should revert when non-owner tries to revoke", async function () {
      await expect(kantaraConsent.connect(user2).revokeConsent(receiptId))
        .to.be.revertedWith("Not the consent owner");
    });
  });

  describe("isConsentValid", function () {
    it("should return true for valid non-expired consent", async function () {
      const expiryTime = Math.floor(Date.now() / 1000) + 86400 * 365;

      await kantaraConsent.connect(user1).giveConsent(
        dataController.address,
        [Purpose.ServiceProvision],
        PI_CATEGORIES,
        ConsentType.Express,
        expiryTime,
        false,
        POLICY_URL
      );

      const receipts = await kantaraConsent.getUserReceipts(user1.address);
      expect(await kantaraConsent.isConsentValid(receipts[0])).to.be.true;
    });

    it("should return true for consent with no expiry (expiryTime = 0)", async function () {
      await kantaraConsent.connect(user1).giveConsent(
        dataController.address,
        [Purpose.ServiceProvision],
        PI_CATEGORIES,
        ConsentType.Express,
        0, // No expiry
        false,
        POLICY_URL
      );

      const receipts = await kantaraConsent.getUserReceipts(user1.address);
      expect(await kantaraConsent.isConsentValid(receipts[0])).to.be.true;
    });

    it("should return false for expired consent", async function () {
      // Create consent that expires in 100 seconds
      const block = await ethers.provider.getBlock("latest");
      const expiryTime = block!.timestamp + 100;

      await kantaraConsent.connect(user1).giveConsent(
        dataController.address,
        [Purpose.ServiceProvision],
        PI_CATEGORIES,
        ConsentType.Express,
        expiryTime,
        false,
        POLICY_URL
      );

      const receipts = await kantaraConsent.getUserReceipts(user1.address);

      // Fast forward time past expiry
      await ethers.provider.send("evm_increaseTime", [150]);
      await ethers.provider.send("evm_mine", []);

      expect(await kantaraConsent.isConsentValid(receipts[0])).to.be.false;
    });

    it("should return false for revoked consent", async function () {
      const expiryTime = Math.floor(Date.now() / 1000) + 86400 * 365;

      await kantaraConsent.connect(user1).giveConsent(
        dataController.address,
        [Purpose.ServiceProvision],
        PI_CATEGORIES,
        ConsentType.Express,
        expiryTime,
        false,
        POLICY_URL
      );

      const receipts = await kantaraConsent.getUserReceipts(user1.address);
      const receiptId = receipts[0];

      await kantaraConsent.connect(user1).revokeConsent(receiptId);
      expect(await kantaraConsent.isConsentValid(receiptId)).to.be.false;
    });

    it("should return false for non-existent receipt", async function () {
      const fakeReceiptId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      expect(await kantaraConsent.isConsentValid(fakeReceiptId)).to.be.false;
    });
  });

  describe("hasValidConsent", function () {
    it("should return true when user has valid consent for purpose", async function () {
      const expiryTime = Math.floor(Date.now() / 1000) + 86400 * 365;

      await kantaraConsent.connect(user1).giveConsent(
        dataController.address,
        [Purpose.ServiceProvision, Purpose.DirectMarketing],
        PI_CATEGORIES,
        ConsentType.Express,
        expiryTime,
        false,
        POLICY_URL
      );

      expect(
        await kantaraConsent.hasValidConsent(user1.address, dataController.address, Purpose.ServiceProvision)
      ).to.be.true;
      expect(
        await kantaraConsent.hasValidConsent(user1.address, dataController.address, Purpose.DirectMarketing)
      ).to.be.true;
    });

    it("should return false when user has no consent for purpose", async function () {
      const expiryTime = Math.floor(Date.now() / 1000) + 86400 * 365;

      await kantaraConsent.connect(user1).giveConsent(
        dataController.address,
        [Purpose.ServiceProvision],
        PI_CATEGORIES,
        ConsentType.Express,
        expiryTime,
        false,
        POLICY_URL
      );

      expect(
        await kantaraConsent.hasValidConsent(user1.address, dataController.address, Purpose.ScientificResearch)
      ).to.be.false;
    });

    it("should return false when consent is for different controller", async function () {
      const expiryTime = Math.floor(Date.now() / 1000) + 86400 * 365;

      await kantaraConsent.connect(user1).giveConsent(
        dataController.address,
        [Purpose.ServiceProvision],
        PI_CATEGORIES,
        ConsentType.Express,
        expiryTime,
        false,
        POLICY_URL
      );

      expect(
        await kantaraConsent.hasValidConsent(user1.address, user2.address, Purpose.ServiceProvision)
      ).to.be.false;
    });

    it("should return false for expired consent", async function () {
      const block = await ethers.provider.getBlock("latest");
      const expiryTime = block!.timestamp + 100;

      await kantaraConsent.connect(user1).giveConsent(
        dataController.address,
        [Purpose.ServiceProvision],
        PI_CATEGORIES,
        ConsentType.Express,
        expiryTime,
        false,
        POLICY_URL
      );

      // Fast forward time past expiry
      await ethers.provider.send("evm_increaseTime", [150]);
      await ethers.provider.send("evm_mine", []);

      expect(
        await kantaraConsent.hasValidConsent(user1.address, dataController.address, Purpose.ServiceProvision)
      ).to.be.false;
    });
  });

  describe("Pagination", function () {
    beforeEach(async function () {
      const expiryTime = Math.floor(Date.now() / 1000) + 86400 * 365;
      for (let i = 0; i < 10; i++) {
        await kantaraConsent.connect(user1).giveConsent(
          dataController.address,
          [Purpose.ServiceProvision],
          PI_CATEGORIES,
          ConsentType.Express,
          expiryTime,
          false,
          POLICY_URL
        );
      }
    });

    it("should return paginated results", async function () {
      const page1 = await kantaraConsent.getUserReceiptsPaginated(user1.address, 0, 3);
      expect(page1.length).to.equal(3);

      const page2 = await kantaraConsent.getUserReceiptsPaginated(user1.address, 3, 3);
      expect(page2.length).to.equal(3);
    });

    it("should return correct count", async function () {
      const count = await kantaraConsent.getUserReceiptsCount(user1.address);
      expect(count).to.equal(10);
    });
  });
});
