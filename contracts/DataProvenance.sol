// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract DataProvenance {
    // Security: Maximum limits to prevent unbounded growth
    uint256 public constant MAX_TRANSFORMATIONS = 100;
    uint256 public constant MAX_ACCESSORS = 1000;

    // RBAC: Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

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
    // Delegated ownership: owner => delegate => authorized
    mapping(address => mapping(address => bool)) public authorizedDelegates;
    // RBAC: role => account => hasRole
    mapping(bytes32 => mapping(address => bool)) private _roles;
    // RBAC: Track all role members for enumeration
    mapping(bytes32 => address[]) private _roleMembers;
    address public contractAdmin;

    event DataRegistered(bytes32 indexed dataHash, address indexed owner, string dataType);
    event DelegateAuthorized(address indexed owner, address indexed delegate, bool authorized);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event DataTransformed(bytes32 indexed originalDataHash, bytes32 indexed newDataHash, string transformation);
    event DataAccessed(bytes32 indexed dataHash, address indexed accessor);
    event DataStatusChanged(bytes32 indexed dataHash, DataStatus oldStatus, DataStatus newStatus);
    event DataOwnershipTransferred(bytes32 indexed dataHash, address indexed previousOwner, address indexed newOwner);

    // RBAC modifiers
    modifier onlyRole(bytes32 role) {
        require(hasRole(role, msg.sender), "AccessControl: account is missing role");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "AccessControl: admin role required");
        _;
    }

    constructor() {
        contractAdmin = msg.sender;
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ============ RBAC Functions ============

    /// @notice Check if account has role
    /// @param role Role identifier
    /// @param account Account address
    /// @return bool True if account has role
    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role][account];
    }

    /// @notice Grant role to account (admin only)
    /// @param role Role identifier
    /// @param account Account to grant role to
    function grantRole(bytes32 role, address account) public onlyAdmin {
        _grantRole(role, account);
    }

    /// @notice Revoke role from account (admin only)
    /// @param role Role identifier
    /// @param account Account to revoke role from
    function revokeRole(bytes32 role, address account) public onlyAdmin {
        _revokeRole(role, account);
    }

    /// @notice Renounce role (caller renounces their own role)
    /// @param role Role identifier
    function renounceRole(bytes32 role) public {
        _revokeRole(role, msg.sender);
    }

    /// @notice Get role member count
    /// @param role Role identifier
    /// @return uint256 Number of members
    function getRoleMemberCount(bytes32 role) public view returns (uint256) {
        return _roleMembers[role].length;
    }

    /// @notice Get role member at index
    /// @param role Role identifier
    /// @param index Member index
    /// @return address Member address
    function getRoleMember(bytes32 role, uint256 index) public view returns (address) {
        require(index < _roleMembers[role].length, "Index out of bounds");
        return _roleMembers[role][index];
    }

    function _grantRole(bytes32 role, address account) internal {
        if (!_roles[role][account]) {
            _roles[role][account] = true;
            _roleMembers[role].push(account);
            emit RoleGranted(role, account, msg.sender);
        }
    }

    function _revokeRole(bytes32 role, address account) internal {
        if (_roles[role][account]) {
            _roles[role][account] = false;
            // Remove from roleMembers array (swap and pop)
            address[] storage members = _roleMembers[role];
            for (uint256 i = 0; i < members.length; i++) {
                if (members[i] == account) {
                    members[i] = members[members.length - 1];
                    members.pop();
                    break;
                }
            }
            emit RoleRevoked(role, account, msg.sender);
        }
    }

    // ============ Operator Functions (RBAC) ============

    /// @notice Set data status (operator role - for compliance)
    /// @param _dataHash Hash of data
    /// @param _newStatus New status
    function operatorSetDataStatus(bytes32 _dataHash, DataStatus _newStatus) public onlyRole(OPERATOR_ROLE) {
        require(dataRecords[_dataHash].owner != address(0), "Data does not exist");

        DataStatus oldStatus = dataRecords[_dataHash].status;
        require(oldStatus != _newStatus, "Status unchanged");

        dataRecords[_dataHash].status = _newStatus;
        emit DataStatusChanged(_dataHash, oldStatus, _newStatus);
    }

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

    /// @notice Authorize or revoke a delegate
    /// @param _delegate Address to authorize/revoke
    /// @param _authorized True to authorize, false to revoke
    function setDelegate(address _delegate, bool _authorized) public {
        require(_delegate != address(0), "Invalid delegate");
        require(_delegate != msg.sender, "Cannot delegate to self");

        authorizedDelegates[msg.sender][_delegate] = _authorized;
        emit DelegateAuthorized(msg.sender, _delegate, _authorized);
    }

    /// @notice Check if delegate is authorized for owner
    /// @param _owner Owner address
    /// @param _delegate Delegate address
    /// @return bool True if authorized
    function isAuthorizedDelegate(address _owner, address _delegate) public view returns (bool) {
        return authorizedDelegates[_owner][_delegate];
    }

    /// @notice Register data on behalf of another user (delegated registration)
    /// @param _dataHash The hash of the data
    /// @param _dataType The type/category of data
    /// @param _actualOwner The actual owner of the data
    function registerDataFor(bytes32 _dataHash, string memory _dataType, address _actualOwner) public {
        require(_actualOwner != address(0), "Invalid owner");
        require(authorizedDelegates[_actualOwner][msg.sender], "Not authorized delegate");
        require(_dataHash != bytes32(0), "Invalid data hash");
        require(bytes(_dataType).length > 0, "Data type cannot be empty");
        require(bytes(_dataType).length <= 64, "Data type too long");
        require(dataRecords[_dataHash].owner == address(0), "Data already registered");

        DataRecord storage newRecord = dataRecords[_dataHash];
        newRecord.dataHash = _dataHash;
        newRecord.owner = _actualOwner;
        newRecord.timestamp = block.timestamp;
        newRecord.dataType = _dataType;
        newRecord.status = DataStatus.Active;

        userDataRecords[_actualOwner].push(_dataHash);

        emit DataRegistered(_dataHash, _actualOwner, _dataType);
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

    // ============ Batch Operations ============

    /// @notice Register multiple data items in a single transaction
    /// @param _dataHashes Array of data hashes
    /// @param _dataTypes Array of data types
    function batchRegisterData(
        bytes32[] memory _dataHashes,
        string[] memory _dataTypes
    ) public {
        require(_dataHashes.length > 0, "Empty data hashes array");
        require(_dataHashes.length <= 50, "Too many data items");
        require(_dataHashes.length == _dataTypes.length, "Array length mismatch");

        for (uint256 i = 0; i < _dataHashes.length; i++) {
            registerData(_dataHashes[i], _dataTypes[i]);
        }
    }

    /// @notice Record access to multiple data items in a single transaction
    /// @param _dataHashes Array of data hashes to record access for
    function batchRecordAccess(bytes32[] memory _dataHashes) public {
        require(_dataHashes.length > 0, "Empty data hashes array");
        require(_dataHashes.length <= 100, "Too many data items");

        for (uint256 i = 0; i < _dataHashes.length; i++) {
            recordAccess(_dataHashes[i]);
        }
    }

    /// @notice Set status for multiple data items in a single transaction
    /// @param _dataHashes Array of data hashes
    /// @param _statuses Array of statuses
    function batchSetDataStatus(
        bytes32[] memory _dataHashes,
        DataStatus[] memory _statuses
    ) public {
        require(_dataHashes.length > 0, "Empty data hashes array");
        require(_dataHashes.length <= 50, "Too many data items");
        require(_dataHashes.length == _statuses.length, "Array length mismatch");

        for (uint256 i = 0; i < _dataHashes.length; i++) {
            setDataStatus(_dataHashes[i], _statuses[i]);
        }
    }
}
