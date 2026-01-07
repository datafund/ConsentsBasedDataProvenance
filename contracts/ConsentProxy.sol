// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract ConsentProxy {
    struct Delegation {
        address delegator;
        address delegate;
        uint256 validUntil;
        bytes32[] allowedPurposeHashes;
        bool isActive;
    }

    mapping(address => mapping(address => Delegation)) public delegations;
    mapping(address => address[]) public delegatorDelegates;
    mapping(address => address[]) public delegateDelegators;

    uint256 public constant MAX_DELEGATION_DURATION = 365 days;

    event DelegationGranted(address indexed delegator, address indexed delegate, uint256 validUntil);
    event DelegationRevoked(address indexed delegator, address indexed delegate);
    event DelegationExtended(address indexed delegator, address indexed delegate, uint256 newValidUntil);

    function grantDelegation(
        address _delegate,
        uint256 _validUntil,
        string[] memory _allowedPurposes
    ) external {
        require(_delegate != address(0), "Invalid delegate");
        require(_delegate != msg.sender, "Cannot delegate to self");
        require(_validUntil > block.timestamp, "Invalid expiry");
        require(_validUntil <= block.timestamp + MAX_DELEGATION_DURATION, "Duration too long");

        bytes32[] memory purposeHashes = new bytes32[](_allowedPurposes.length);
        for (uint256 i = 0; i < _allowedPurposes.length; i++) {
            purposeHashes[i] = keccak256(bytes(_allowedPurposes[i]));
        }

        if (!delegations[msg.sender][_delegate].isActive) {
            delegatorDelegates[msg.sender].push(_delegate);
            delegateDelegators[_delegate].push(msg.sender);
        }

        delegations[msg.sender][_delegate] = Delegation({
            delegator: msg.sender,
            delegate: _delegate,
            validUntil: _validUntil,
            allowedPurposeHashes: purposeHashes,
            isActive: true
        });

        emit DelegationGranted(msg.sender, _delegate, _validUntil);
    }

    function revokeDelegation(address _delegate) external {
        require(delegations[msg.sender][_delegate].isActive, "No active delegation");

        delegations[msg.sender][_delegate].isActive = false;
        emit DelegationRevoked(msg.sender, _delegate);
    }

    function extendDelegation(address _delegate, uint256 _newValidUntil) external {
        Delegation storage d = delegations[msg.sender][_delegate];
        require(d.isActive, "No active delegation");
        require(_newValidUntil > d.validUntil, "Must extend, not shorten");
        require(_newValidUntil <= block.timestamp + MAX_DELEGATION_DURATION, "Duration too long");

        d.validUntil = _newValidUntil;
        emit DelegationExtended(msg.sender, _delegate, _newValidUntil);
    }

    function canActFor(
        address _delegator,
        address _delegate,
        string memory _purpose
    ) external view returns (bool) {
        Delegation storage d = delegations[_delegator][_delegate];

        if (!d.isActive) return false;
        if (d.validUntil < block.timestamp) return false;

        if (d.allowedPurposeHashes.length == 0) return true;

        bytes32 purposeHash = keccak256(bytes(_purpose));
        for (uint256 i = 0; i < d.allowedPurposeHashes.length; i++) {
            if (d.allowedPurposeHashes[i] == purposeHash) return true;
        }
        return false;
    }

    function getDelegation(address _delegator, address _delegate)
        external view returns (Delegation memory)
    {
        return delegations[_delegator][_delegate];
    }

    function getDelegates(address _delegator) external view returns (address[] memory) {
        return delegatorDelegates[_delegator];
    }

    function getDelegators(address _delegate) external view returns (address[] memory) {
        return delegateDelegators[_delegate];
    }

    function isDelegationValid(address _delegator, address _delegate) external view returns (bool) {
        Delegation storage d = delegations[_delegator][_delegate];
        return d.isActive && d.validUntil >= block.timestamp;
    }
}
