// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "./DataProvenance.sol";

contract DataDeletion {
    DataProvenance public provenanceContract;

    struct DeletionProof {
        bytes32 dataHash;
        address requester;
        uint256 deletionTimestamp;
        bytes32 proofHash;
        address operator;
        string reason;
    }

    mapping(bytes32 => DeletionProof) public deletionProofs;
    mapping(bytes32 => bool) public isDeleted;
    mapping(address => bytes32[]) public userDeletionRequests;

    event DeletionRequested(bytes32 indexed dataHash, address indexed requester, string reason);
    event DeletionCompleted(bytes32 indexed dataHash, address indexed operator, bytes32 proofHash);

    constructor(address _provenanceContract) {
        require(_provenanceContract != address(0), "Invalid provenance contract");
        provenanceContract = DataProvenance(_provenanceContract);
    }

    function requestDeletion(bytes32 _dataHash, string memory _reason) external {
        require(!isDeleted[_dataHash], "Already deleted");

        DataProvenance.DataRecord memory record = provenanceContract.getDataRecord(_dataHash);
        require(record.owner == msg.sender, "Not the data owner");
        require(record.status != DataProvenance.DataStatus.Deleted, "Data already marked deleted");

        bytes32 proofHash = keccak256(abi.encodePacked(
            _dataHash,
            msg.sender,
            block.timestamp,
            blockhash(block.number - 1)
        ));

        deletionProofs[_dataHash] = DeletionProof({
            dataHash: _dataHash,
            requester: msg.sender,
            deletionTimestamp: block.timestamp,
            proofHash: proofHash,
            operator: msg.sender,
            reason: _reason
        });

        isDeleted[_dataHash] = true;
        userDeletionRequests[msg.sender].push(_dataHash);

        emit DeletionRequested(_dataHash, msg.sender, _reason);
        emit DeletionCompleted(_dataHash, msg.sender, proofHash);
    }

    function verifyDeletion(bytes32 _dataHash) external view returns (bool deleted, DeletionProof memory proof) {
        return (isDeleted[_dataHash], deletionProofs[_dataHash]);
    }

    function getUserDeletionRequests(address _user) external view returns (bytes32[] memory) {
        return userDeletionRequests[_user];
    }

    function isDataAccessible(bytes32 _dataHash) external view returns (bool) {
        return !isDeleted[_dataHash];
    }
}
