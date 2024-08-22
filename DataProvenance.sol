// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DataProvenance {
    struct DataRecord {
        bytes32 dataHash;
        address owner;
        uint256 timestamp;
        string dataType;
        string[] transformations;
        address[] accessors;
    }

    mapping(bytes32 => DataRecord) public dataRecords;
    mapping(address => bytes32[]) public userDataRecords;

    event DataRegistered(bytes32 indexed dataHash, address indexed owner, string dataType);
    event DataTransformed(bytes32 indexed originalDataHash, bytes32 indexed newDataHash, string transformation);
    event DataAccessed(bytes32 indexed dataHash, address indexed accessor);

    function registerData(bytes32 _dataHash, string memory _dataType) public {
        require(dataRecords[_dataHash].owner == address(0), "Data already registered");

        DataRecord memory newRecord = DataRecord({
            dataHash: _dataHash,
            owner: msg.sender,
            timestamp: block.timestamp,
            dataType: _dataType,
            transformations: new string[](0),
            accessors: new address[](0)
        });

        dataRecords[_dataHash] = newRecord;
        userDataRecords[msg.sender].push(_dataHash);

        emit DataRegistered(_dataHash, msg.sender, _dataType);
    }

    function recordTransformation(bytes32 _originalDataHash, bytes32 _newDataHash, string memory _transformation) public {
        require(dataRecords[_originalDataHash].owner == msg.sender, "Not the owner of the original data");
        require(dataRecords[_newDataHash].owner == address(0), "New data hash already exists");

        DataRecord storage originalRecord = dataRecords[_originalDataHash];
        originalRecord.transformations.push(_transformation);

        DataRecord memory newRecord = DataRecord({
            dataHash: _newDataHash,
            owner: msg.sender,
            timestamp: block.timestamp,
            dataType: originalRecord.dataType,
            transformations: new string[](0),
            accessors: new address[](0)
        });

        dataRecords[_newDataHash] = newRecord;
        userDataRecords[msg.sender].push(_newDataHash);

        emit DataTransformed(_originalDataHash, _newDataHash, _transformation);
    }

    function recordAccess(bytes32 _dataHash) public {
        require(dataRecords[_dataHash].owner != address(0), "Data does not exist");
        
        DataRecord storage record = dataRecords[_dataHash];
        record.accessors.push(msg.sender);

        emit DataAccessed(_dataHash, msg.sender);
    }

    function getDataRecord(bytes32 _dataHash) public view returns (DataRecord memory) {
        return dataRecords[_dataHash];
    }

    function getUserDataRecords(address _user) public view returns (bytes32[] memory) {
        return userDataRecords[_user];
    }
}
