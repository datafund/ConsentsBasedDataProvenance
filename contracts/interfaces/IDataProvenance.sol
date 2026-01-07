// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IDataProvenance {
    enum DataStatus { Active, Restricted, Deleted }

    struct DataRecord {
        bytes32 dataHash;
        address owner;
        string dataType;
        uint256 timestamp;
        string[] transformations;
        address[] accessors;
        DataStatus status;
    }

    event DataRegistered(bytes32 indexed dataHash, address indexed owner, string dataType);
    event DataTransformed(bytes32 indexed originalHash, bytes32 indexed newHash, string transformation);
    event DataAccessed(bytes32 indexed dataHash, address indexed accessor);
    event DataStatusChanged(bytes32 indexed dataHash, DataStatus oldStatus, DataStatus newStatus);
    event DataOwnershipTransferred(bytes32 indexed dataHash, address indexed oldOwner, address indexed newOwner);

    function registerData(bytes32 _dataHash, string memory _dataType) external;
    function setDelegate(address _delegate, bool _authorized) external;
    function isAuthorizedDelegate(address _owner, address _delegate) external view returns (bool);
    function registerDataFor(bytes32 _dataHash, string memory _dataType, address _actualOwner) external;
    function recordTransformation(bytes32 _originalHash, bytes32 _newHash, string memory _transformation) external;
    function recordAccess(bytes32 _dataHash) external;
    function setDataStatus(bytes32 _dataHash, DataStatus _status) external;
    function transferDataOwnership(bytes32 _dataHash, address _newOwner) external;
    function getDataRecord(bytes32 _dataHash) external view returns (DataRecord memory);
    function getUserDataRecords(address _user) external view returns (bytes32[] memory);
    function hasAddressAccessed(bytes32 _dataHash, address _accessor) external view returns (bool);
}
