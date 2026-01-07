// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract DataProvenance {
    // Security: Maximum limits to prevent unbounded growth
    uint256 public constant MAX_TRANSFORMATIONS = 100;
    uint256 public constant MAX_ACCESSORS = 1000;

    enum DataStatus {
        Active,
        Restricted,
        Deleted
    }

    struct DataRecord {
        bytes32 dataHash;
        address owner;
        uint256 timestamp;
        string dataType;
        string[] transformations;
        address[] accessors;
        DataStatus status;
    }

    mapping(bytes32 => DataRecord) public dataRecords;
    mapping(address => bytes32[]) public userDataRecords;
    // Security: Track if address has already accessed data (prevent duplicates)
    mapping(bytes32 => mapping(address => bool)) private hasAccessed;

    event DataRegistered(bytes32 indexed dataHash, address indexed owner, string dataType);
    event DataTransformed(bytes32 indexed originalDataHash, bytes32 indexed newDataHash, string transformation);
    event DataAccessed(bytes32 indexed dataHash, address indexed accessor);
    event DataStatusChanged(bytes32 indexed dataHash, DataStatus oldStatus, DataStatus newStatus);
    event DataOwnershipTransferred(bytes32 indexed dataHash, address indexed previousOwner, address indexed newOwner);

    /// @notice Register new data
    /// @param _dataHash The hash of the data
    /// @param _dataType The type/category of data
    function registerData(bytes32 _dataHash, string memory _dataType) public {
        require(_dataHash != bytes32(0), "Invalid data hash");
        require(bytes(_dataType).length > 0, "Data type cannot be empty");
        require(bytes(_dataType).length <= 64, "Data type too long");
        require(dataRecords[_dataHash].owner == address(0), "Data already registered");

        DataRecord storage newRecord = dataRecords[_dataHash];
        newRecord.dataHash = _dataHash;
        newRecord.owner = msg.sender;
        newRecord.timestamp = block.timestamp;
        newRecord.dataType = _dataType;
        newRecord.status = DataStatus.Active;

        userDataRecords[msg.sender].push(_dataHash);

        emit DataRegistered(_dataHash, msg.sender, _dataType);
    }

    /// @notice Record a transformation of data
    /// @param _originalDataHash Hash of original data
    /// @param _newDataHash Hash of transformed data
    /// @param _transformation Description of transformation
    function recordTransformation(
        bytes32 _originalDataHash,
        bytes32 _newDataHash,
        string memory _transformation
    ) public {
        require(dataRecords[_originalDataHash].owner == msg.sender, "Not the owner of the original data");
        require(dataRecords[_originalDataHash].status == DataStatus.Active, "Data is not active");
        require(dataRecords[_newDataHash].owner == address(0), "New data hash already exists");
        require(bytes(_transformation).length > 0, "Transformation cannot be empty");
        require(bytes(_transformation).length <= 256, "Transformation too long");

        DataRecord storage originalRecord = dataRecords[_originalDataHash];
        // Security: Prevent unbounded array growth
        require(originalRecord.transformations.length < MAX_TRANSFORMATIONS, "Max transformations reached");
        originalRecord.transformations.push(_transformation);

        DataRecord storage newRecord = dataRecords[_newDataHash];
        newRecord.dataHash = _newDataHash;
        newRecord.owner = msg.sender;
        newRecord.timestamp = block.timestamp;
        newRecord.dataType = originalRecord.dataType;
        newRecord.status = DataStatus.Active;

        userDataRecords[msg.sender].push(_newDataHash);

        emit DataTransformed(_originalDataHash, _newDataHash, _transformation);
    }

    /// @notice Record access to data
    /// @param _dataHash Hash of data being accessed
    function recordAccess(bytes32 _dataHash) public {
        require(dataRecords[_dataHash].owner != address(0), "Data does not exist");
        require(dataRecords[_dataHash].status == DataStatus.Active, "Data is not active");

        DataRecord storage record = dataRecords[_dataHash];

        // Security: Prevent duplicate access records and unbounded growth
        if (!hasAccessed[_dataHash][msg.sender]) {
            require(record.accessors.length < MAX_ACCESSORS, "Max accessors reached");
            hasAccessed[_dataHash][msg.sender] = true;
            record.accessors.push(msg.sender);
        }

        emit DataAccessed(_dataHash, msg.sender);
    }

    /// @notice Transfer data ownership
    /// @param _dataHash Hash of data to transfer
    /// @param _newOwner New owner address
    function transferDataOwnership(bytes32 _dataHash, address _newOwner) public {
        require(dataRecords[_dataHash].owner == msg.sender, "Not the owner");
        require(_newOwner != address(0), "Invalid new owner");
        require(_newOwner != msg.sender, "Already the owner");

        address previousOwner = dataRecords[_dataHash].owner;
        dataRecords[_dataHash].owner = _newOwner;
        userDataRecords[_newOwner].push(_dataHash);

        emit DataOwnershipTransferred(_dataHash, previousOwner, _newOwner);
    }

    /// @notice Change data status (only owner)
    /// @param _dataHash Hash of data
    /// @param _newStatus New status
    function setDataStatus(bytes32 _dataHash, DataStatus _newStatus) public {
        require(dataRecords[_dataHash].owner == msg.sender, "Not the owner");

        DataStatus oldStatus = dataRecords[_dataHash].status;
        require(oldStatus != _newStatus, "Status unchanged");

        dataRecords[_dataHash].status = _newStatus;
        emit DataStatusChanged(_dataHash, oldStatus, _newStatus);
    }

    /// @notice Get data record
    /// @param _dataHash Hash of data
    /// @return DataRecord The data record
    function getDataRecord(bytes32 _dataHash) public view returns (DataRecord memory) {
        return dataRecords[_dataHash];
    }

    /// @notice Get all data hashes for a user
    /// @param _user User address
    /// @return bytes32[] Array of data hashes
    function getUserDataRecords(address _user) public view returns (bytes32[] memory) {
        return userDataRecords[_user];
    }

    /// @notice Get paginated data hashes for a user
    /// @param _user User address
    /// @param _offset Starting index
    /// @param _limit Maximum results
    /// @return bytes32[] Array of data hashes
    function getUserDataRecordsPaginated(
        address _user,
        uint256 _offset,
        uint256 _limit
    ) public view returns (bytes32[] memory) {
        bytes32[] storage allRecords = userDataRecords[_user];

        if (_offset >= allRecords.length) {
            return new bytes32[](0);
        }

        uint256 end = _offset + _limit;
        if (end > allRecords.length) {
            end = allRecords.length;
        }

        uint256 resultLength = end - _offset;
        bytes32[] memory result = new bytes32[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = allRecords[_offset + i];
        }

        return result;
    }

    /// @notice Check if address has accessed data
    /// @param _dataHash Hash of data
    /// @param _accessor Address to check
    /// @return bool True if accessed
    function hasAddressAccessed(bytes32 _dataHash, address _accessor) public view returns (bool) {
        return hasAccessed[_dataHash][_accessor];
    }

    /// @notice Get count of user data records
    /// @param _user User address
    /// @return uint256 Count
    function getUserDataRecordsCount(address _user) public view returns (uint256) {
        return userDataRecords[_user].length;
    }
}
