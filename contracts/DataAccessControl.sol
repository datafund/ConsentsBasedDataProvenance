// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "./DataProvenance.sol";

contract DataAccessControl {
    enum AccessLevel { None, Read, Transform, Full }

    struct AccessGrant {
        address grantee;
        AccessLevel level;
        uint256 validUntil;
        bytes32 consentReceiptId;
        bool isActive;
    }

    DataProvenance public provenanceContract;

    mapping(bytes32 => mapping(address => AccessGrant)) public accessGrants;
    mapping(bytes32 => address[]) public dataGrantees;
    mapping(address => bytes32[]) public userAccessibleData;

    uint256 public constant MAX_ACCESS_DURATION = 365 days * 2;

    event AccessGranted(bytes32 indexed dataHash, address indexed grantee, AccessLevel level, uint256 validUntil);
    event AccessRevoked(bytes32 indexed dataHash, address indexed grantee);
    event AccessLevelChanged(bytes32 indexed dataHash, address indexed grantee, AccessLevel oldLevel, AccessLevel newLevel);

    constructor(address _provenanceContract) {
        require(_provenanceContract != address(0), "Invalid provenance contract");
        provenanceContract = DataProvenance(_provenanceContract);
    }

    function grantAccess(
        bytes32 _dataHash,
        address _grantee,
        AccessLevel _level,
        uint256 _validUntil,
        bytes32 _consentReceiptId
    ) external {
        DataProvenance.DataRecord memory record = provenanceContract.getDataRecord(_dataHash);
        require(record.owner == msg.sender, "Not the data owner");
        require(_grantee != address(0), "Invalid grantee");
        require(_grantee != msg.sender, "Cannot grant to self");
        require(_level != AccessLevel.None, "Invalid access level");
        require(_validUntil > block.timestamp, "Invalid expiry");
        require(_validUntil <= block.timestamp + MAX_ACCESS_DURATION, "Duration too long");

        if (!accessGrants[_dataHash][_grantee].isActive) {
            dataGrantees[_dataHash].push(_grantee);
            userAccessibleData[_grantee].push(_dataHash);
        }

        accessGrants[_dataHash][_grantee] = AccessGrant({
            grantee: _grantee,
            level: _level,
            validUntil: _validUntil,
            consentReceiptId: _consentReceiptId,
            isActive: true
        });

        emit AccessGranted(_dataHash, _grantee, _level, _validUntil);
    }

    function revokeAccess(bytes32 _dataHash, address _grantee) external {
        DataProvenance.DataRecord memory record = provenanceContract.getDataRecord(_dataHash);
        require(record.owner == msg.sender, "Not the data owner");
        require(accessGrants[_dataHash][_grantee].isActive, "No active grant");

        accessGrants[_dataHash][_grantee].isActive = false;
        emit AccessRevoked(_dataHash, _grantee);
    }

    function changeAccessLevel(bytes32 _dataHash, address _grantee, AccessLevel _newLevel) external {
        DataProvenance.DataRecord memory record = provenanceContract.getDataRecord(_dataHash);
        require(record.owner == msg.sender, "Not the data owner");
        require(accessGrants[_dataHash][_grantee].isActive, "No active grant");
        require(_newLevel != AccessLevel.None, "Use revokeAccess instead");

        AccessLevel oldLevel = accessGrants[_dataHash][_grantee].level;
        accessGrants[_dataHash][_grantee].level = _newLevel;

        emit AccessLevelChanged(_dataHash, _grantee, oldLevel, _newLevel);
    }

    function checkAccess(bytes32 _dataHash, address _accessor, AccessLevel _requiredLevel)
        external view returns (bool)
    {
        AccessGrant storage grant = accessGrants[_dataHash][_accessor];

        if (!grant.isActive) return false;
        if (grant.validUntil < block.timestamp) return false;

        return uint8(grant.level) >= uint8(_requiredLevel);
    }

    function getAccessGrant(bytes32 _dataHash, address _grantee)
        external view returns (AccessGrant memory)
    {
        return accessGrants[_dataHash][_grantee];
    }

    function getDataGrantees(bytes32 _dataHash) external view returns (address[] memory) {
        return dataGrantees[_dataHash];
    }

    function getUserAccessibleData(address _user) external view returns (bytes32[] memory) {
        return userAccessibleData[_user];
    }

    function isAccessValid(bytes32 _dataHash, address _accessor) external view returns (bool) {
        AccessGrant storage grant = accessGrants[_dataHash][_accessor];
        return grant.isActive && grant.validUntil >= block.timestamp;
    }
}
