// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ConsentReceipt {
    struct Consent {
        address user;
        string purpose;
        uint256 timestamp;
        bool isValid;
    }

    mapping(address => Consent[]) public userConsents;

    event ConsentGiven(address indexed user, string purpose, uint256 timestamp);
    event ConsentRevoked(address indexed user, string purpose, uint256 timestamp);

    function giveConsent(string memory _purpose) public {
        Consent memory newConsent = Consent({
            user: msg.sender,
            purpose: _purpose,
            timestamp: block.timestamp,
            isValid: true
        });

        userConsents[msg.sender].push(newConsent);
        emit ConsentGiven(msg.sender, _purpose, block.timestamp);
    }

    function revokeConsent(uint256 _index) public {
        require(_index < userConsents[msg.sender].length, "Invalid consent index");
        require(userConsents[msg.sender][_index].isValid, "Consent already revoked");

        userConsents[msg.sender][_index].isValid = false;
        emit ConsentRevoked(msg.sender, userConsents[msg.sender][_index].purpose, block.timestamp);
    }

    function getConsentStatus(address _user, string memory _purpose) public view returns (bool) {
        Consent[] memory consents = userConsents[_user];
        for (uint i = 0; i < consents.length; i++) {
            if (keccak256(bytes(consents[i].purpose)) == keccak256(bytes(_purpose)) && consents[i].isValid) {
                return true;
            }
        }
        return false;
    }

    function getUserConsents(address _user) public view returns (Consent[] memory) {
        return userConsents[_user];
    }
}
