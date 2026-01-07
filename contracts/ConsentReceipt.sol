// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract ConsentReceipt {
    struct Consent {
        address user;
        string purpose;
        uint256 timestamp;
        uint256 expiryTime;
        bool isValid;
    }

    mapping(address => Consent[]) public userConsents;
    // Optimization: Track consent indices by purpose hash for faster lookup
    mapping(address => mapping(bytes32 => uint256[])) private purposeConsentIndices;

    // EIP-712 typed data
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 public constant CONSENT_TYPEHASH = keccak256(
        "Consent(address user,string purpose,uint256 expiryTime,uint256 nonce,uint256 deadline)"
    );
    bytes32 public immutable DOMAIN_SEPARATOR;
    mapping(address => uint256) public signatureNonces;

    event ConsentGiven(address indexed user, string purpose, uint256 timestamp, uint256 expiryTime);
    event ConsentRevoked(address indexed user, string purpose, uint256 timestamp);
    event ConsentGivenBySig(address indexed user, string purpose, address indexed relayer);

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes("ConsentReceipt")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /// @notice Give consent for a specific purpose
    /// @param _purpose The purpose for which consent is given
    /// @param _expiryTime Optional expiry timestamp (0 = no expiry)
    function giveConsent(string memory _purpose, uint256 _expiryTime) public {
        require(bytes(_purpose).length > 0, "Purpose cannot be empty");
        require(bytes(_purpose).length <= 256, "Purpose too long");
        require(_expiryTime == 0 || _expiryTime > block.timestamp, "Expiry must be in future");

        Consent memory newConsent = Consent({
            user: msg.sender,
            purpose: _purpose,
            timestamp: block.timestamp,
            expiryTime: _expiryTime,
            isValid: true
        });

        uint256 consentIndex = userConsents[msg.sender].length;
        userConsents[msg.sender].push(newConsent);

        // Optimization: Track consent index by purpose hash
        bytes32 purposeHash = keccak256(bytes(_purpose));
        purposeConsentIndices[msg.sender][purposeHash].push(consentIndex);

        emit ConsentGiven(msg.sender, _purpose, block.timestamp, _expiryTime);
    }

    /// @notice Give consent without expiry (backward compatible)
    /// @param _purpose The purpose for which consent is given
    function giveConsent(string memory _purpose) public {
        giveConsent(_purpose, 0);
    }

    /// @notice Revoke consent by index
    /// @param _index The index of the consent to revoke
    function revokeConsent(uint256 _index) public {
        require(_index < userConsents[msg.sender].length, "Invalid consent index");
        require(userConsents[msg.sender][_index].isValid, "Consent already revoked");

        userConsents[msg.sender][_index].isValid = false;
        emit ConsentRevoked(msg.sender, userConsents[msg.sender][_index].purpose, block.timestamp);
    }

    /// @notice Check if user has valid consent for a purpose
    /// @dev Optimized: Only checks consents for the specific purpose, not all consents
    /// @param _user The user address to check
    /// @param _purpose The purpose to check consent for
    /// @return bool True if valid consent exists
    function getConsentStatus(address _user, string memory _purpose) public view returns (bool) {
        bytes32 purposeHash = keccak256(bytes(_purpose));
        uint256[] memory indices = purposeConsentIndices[_user][purposeHash];

        // Optimization: Only check consents for this specific purpose
        for (uint256 i = 0; i < indices.length; i++) {
            Consent storage consent = userConsents[_user][indices[i]];
            if (consent.isValid &&
                (consent.expiryTime == 0 || consent.expiryTime > block.timestamp)) {
                return true;
            }
        }
        return false;
    }

    /// @notice Get all consents for a user
    /// @param _user The user address
    /// @return Consent[] Array of all consents (including revoked)
    function getUserConsents(address _user) public view returns (Consent[] memory) {
        return userConsents[_user];
    }

    /// @notice Get paginated consents for a user
    /// @param _user The user address
    /// @param _offset Starting index
    /// @param _limit Maximum number of results
    /// @return Consent[] Array of consents
    function getUserConsentsPaginated(
        address _user,
        uint256 _offset,
        uint256 _limit
    ) public view returns (Consent[] memory) {
        Consent[] storage allConsents = userConsents[_user];

        if (_offset >= allConsents.length) {
            return new Consent[](0);
        }

        uint256 end = _offset + _limit;
        if (end > allConsents.length) {
            end = allConsents.length;
        }

        uint256 resultLength = end - _offset;
        Consent[] memory result = new Consent[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = allConsents[_offset + i];
        }

        return result;
    }

    /// @notice Get count of user consents
    /// @param _user The user address
    /// @return uint256 Number of consents
    function getUserConsentsCount(address _user) public view returns (uint256) {
        return userConsents[_user].length;
    }

    // ============ Batch Operations ============

    /// @notice Give consent for multiple purposes in a single transaction
    /// @param _purposes Array of purposes for which consent is given
    /// @param _expiryTimes Array of expiry timestamps (0 = no expiry)
    function batchGiveConsent(
        string[] memory _purposes,
        uint256[] memory _expiryTimes
    ) public {
        require(_purposes.length > 0, "Empty purposes array");
        require(_purposes.length <= 50, "Too many purposes");
        require(_purposes.length == _expiryTimes.length, "Array length mismatch");

        for (uint256 i = 0; i < _purposes.length; i++) {
            giveConsent(_purposes[i], _expiryTimes[i]);
        }
    }

    /// @notice Revoke multiple consents in a single transaction
    /// @param _indices Array of consent indices to revoke
    function batchRevokeConsent(uint256[] memory _indices) public {
        require(_indices.length > 0, "Empty indices array");
        require(_indices.length <= 50, "Too many indices");

        for (uint256 i = 0; i < _indices.length; i++) {
            revokeConsent(_indices[i]);
        }
    }

    // ============ EIP-712 Signed Consent ============

    /// @notice Give consent via EIP-712 signature (meta-transaction)
    /// @param _user The user giving consent
    /// @param _purpose The purpose for consent
    /// @param _expiryTime Consent expiry time
    /// @param _deadline Signature deadline
    /// @param _v Signature v
    /// @param _r Signature r
    /// @param _s Signature s
    function giveConsentBySig(
        address _user,
        string memory _purpose,
        uint256 _expiryTime,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) public {
        require(block.timestamp <= _deadline, "Signature expired");
        require(bytes(_purpose).length > 0, "Purpose cannot be empty");
        require(bytes(_purpose).length <= 256, "Purpose too long");
        require(_expiryTime == 0 || _expiryTime > block.timestamp, "Expiry must be in future");

        uint256 nonce = signatureNonces[_user]++;

        bytes32 structHash = keccak256(
            abi.encode(
                CONSENT_TYPEHASH,
                _user,
                keccak256(bytes(_purpose)),
                _expiryTime,
                nonce,
                _deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        address signer = ecrecover(digest, _v, _r, _s);
        require(signer != address(0) && signer == _user, "Invalid signature");

        // Create consent for the user
        Consent memory newConsent = Consent({
            user: _user,
            purpose: _purpose,
            timestamp: block.timestamp,
            expiryTime: _expiryTime,
            isValid: true
        });

        uint256 consentIndex = userConsents[_user].length;
        userConsents[_user].push(newConsent);

        bytes32 purposeHash = keccak256(bytes(_purpose));
        purposeConsentIndices[_user][purposeHash].push(consentIndex);

        emit ConsentGiven(_user, _purpose, block.timestamp, _expiryTime);
        emit ConsentGivenBySig(_user, _purpose, msg.sender);
    }

    /// @notice Get current nonce for a user (for signature generation)
    /// @param _user User address
    /// @return uint256 Current nonce
    function getNonce(address _user) public view returns (uint256) {
        return signatureNonces[_user];
    }
}
