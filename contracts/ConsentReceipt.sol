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

    event ConsentGiven(address indexed user, string purpose, uint256 timestamp, uint256 expiryTime);
    event ConsentRevoked(address indexed user, string purpose, uint256 timestamp);

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

        userConsents[msg.sender].push(newConsent);
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
    /// @param _user The user address to check
    /// @param _purpose The purpose to check consent for
    /// @return bool True if valid consent exists
    function getConsentStatus(address _user, string memory _purpose) public view returns (bool) {
        Consent[] memory consents = userConsents[_user];
        for (uint i = 0; i < consents.length; i++) {
            if (keccak256(bytes(consents[i].purpose)) == keccak256(bytes(_purpose)) &&
                consents[i].isValid &&
                (consents[i].expiryTime == 0 || consents[i].expiryTime > block.timestamp)) {
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
}
