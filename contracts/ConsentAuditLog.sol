// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract ConsentAuditLog {
    enum AuditAction {
        ConsentGiven,
        ConsentRevoked,
        ConsentExpired,
        DataRegistered,
        DataAccessed,
        DataTransformed,
        DataRestricted,
        DataDeleted,
        OwnershipTransferred,
        AccessGranted,
        AccessRevoked
    }

    struct AuditEntry {
        uint256 timestamp;
        address actor;
        AuditAction action;
        bytes32 subjectId;
        bytes32 relatedId;
        string metadata;
    }

    AuditEntry[] public auditLog;
    mapping(address => uint256[]) public actorAuditIndices;
    mapping(bytes32 => uint256[]) public subjectAuditIndices;
    mapping(address => bool) public authorizedRecorders;
    address public admin;

    event AuditRecorded(uint256 indexed entryIndex, AuditAction indexed action, address indexed actor, bytes32 subjectId);
    event RecorderAuthorized(address indexed recorder, bool authorized);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedRecorders[msg.sender] || msg.sender == admin, "Not authorized");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function setAuthorizedRecorder(address _recorder, bool _authorized) external onlyAdmin {
        authorizedRecorders[_recorder] = _authorized;
        emit RecorderAuthorized(_recorder, _authorized);
    }

    function recordAudit(
        AuditAction _action,
        bytes32 _subjectId,
        bytes32 _relatedId,
        string memory _metadata
    ) external onlyAuthorized {
        uint256 index = auditLog.length;

        auditLog.push(AuditEntry({
            timestamp: block.timestamp,
            actor: tx.origin,
            action: _action,
            subjectId: _subjectId,
            relatedId: _relatedId,
            metadata: _metadata
        }));

        actorAuditIndices[tx.origin].push(index);
        subjectAuditIndices[_subjectId].push(index);

        emit AuditRecorded(index, _action, tx.origin, _subjectId);
    }

    function getAuditCount() external view returns (uint256) {
        return auditLog.length;
    }

    function getAuditEntry(uint256 _index) external view returns (AuditEntry memory) {
        require(_index < auditLog.length, "Index out of bounds");
        return auditLog[_index];
    }

    function getAuditsByActor(address _actor, uint256 _offset, uint256 _limit)
        external view returns (AuditEntry[] memory)
    {
        uint256[] memory indices = actorAuditIndices[_actor];
        if (_offset >= indices.length) {
            return new AuditEntry[](0);
        }

        uint256 end = _offset + _limit;
        if (end > indices.length) {
            end = indices.length;
        }

        AuditEntry[] memory entries = new AuditEntry[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            entries[i - _offset] = auditLog[indices[i]];
        }
        return entries;
    }

    function getAuditsBySubject(bytes32 _subjectId, uint256 _offset, uint256 _limit)
        external view returns (AuditEntry[] memory)
    {
        uint256[] memory indices = subjectAuditIndices[_subjectId];
        if (_offset >= indices.length) {
            return new AuditEntry[](0);
        }

        uint256 end = _offset + _limit;
        if (end > indices.length) {
            end = indices.length;
        }

        AuditEntry[] memory entries = new AuditEntry[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            entries[i - _offset] = auditLog[indices[i]];
        }
        return entries;
    }

    function getActorAuditCount(address _actor) external view returns (uint256) {
        return actorAuditIndices[_actor].length;
    }

    function getSubjectAuditCount(bytes32 _subjectId) external view returns (uint256) {
        return subjectAuditIndices[_subjectId].length;
    }
}
