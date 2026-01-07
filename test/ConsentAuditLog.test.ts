import { expect } from "chai";
import { ethers } from "hardhat";
import { ConsentAuditLog } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ConsentAuditLog", function () {
    let auditLog: ConsentAuditLog;
    let owner: SignerWithAddress;
    let recorder: SignerWithAddress;
    let user: SignerWithAddress;

    const SUBJECT_ID = ethers.keccak256(ethers.toUtf8Bytes("consent_123"));
    const RELATED_ID = ethers.keccak256(ethers.toUtf8Bytes("data_456"));

    beforeEach(async function () {
        [owner, recorder, user] = await ethers.getSigners();

        const AuditLogFactory = await ethers.getContractFactory("ConsentAuditLog");
        auditLog = await AuditLogFactory.deploy();
        await auditLog.waitForDeployment();
    });

    describe("Authorization", function () {
        it("should allow admin to authorize recorders", async function () {
            await expect(auditLog.connect(owner).setAuthorizedRecorder(recorder.address, true))
                .to.emit(auditLog, "RecorderAuthorized")
                .withArgs(recorder.address, true);
        });

        it("should revert when non-admin tries to authorize", async function () {
            await expect(
                auditLog.connect(user).setAuthorizedRecorder(recorder.address, true)
            ).to.be.revertedWith("Not admin");
        });
    });

    describe("recordAudit", function () {
        beforeEach(async function () {
            await auditLog.connect(owner).setAuthorizedRecorder(recorder.address, true);
        });

        it("should record audit entry", async function () {
            await expect(
                auditLog.connect(recorder).recordAudit(0, SUBJECT_ID, RELATED_ID, '{"purpose": "analytics"}')
            ).to.emit(auditLog, "AuditRecorded");
        });

        it("should revert when unauthorized", async function () {
            await expect(
                auditLog.connect(user).recordAudit(0, SUBJECT_ID, RELATED_ID, "")
            ).to.be.revertedWith("Not authorized");
        });
    });

    describe("Query functions", function () {
        beforeEach(async function () {
            await auditLog.connect(owner).setAuthorizedRecorder(recorder.address, true);

            for (let i = 0; i < 5; i++) {
                await auditLog.connect(recorder).recordAudit(i % 3, SUBJECT_ID, RELATED_ID, `{"index": ${i}}`);
            }
        });

        it("should return correct audit count", async function () {
            expect(await auditLog.getAuditCount()).to.equal(5);
        });

        it("should return paginated results by subject", async function () {
            const entries = await auditLog.getAuditsBySubject(SUBJECT_ID, 0, 3);
            expect(entries.length).to.equal(3);
        });

        it("should handle offset beyond array length", async function () {
            const entries = await auditLog.getAuditsBySubject(SUBJECT_ID, 100, 10);
            expect(entries.length).to.equal(0);
        });

        it("should get entry by index", async function () {
            const entry = await auditLog.getAuditEntry(0);
            expect(entry.subjectId).to.equal(SUBJECT_ID);
        });
    });
});
