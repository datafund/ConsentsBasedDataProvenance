// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IConsentReceipt {
    struct Consent {
        address user;
        string purpose;
        uint256 timestamp;
        uint256 expiryTime;
        bool isValid;
    }

    event ConsentGiven(address indexed user, string purpose, uint256 timestamp, uint256 expiryTime);
    event ConsentRevoked(address indexed user, uint256 consentIndex);

    function giveConsent(string memory _purpose) external;
    function giveConsent(string memory _purpose, uint256 _expiryTime) external;
    function revokeConsent(uint256 _consentIndex) external;
    function getConsentStatus(address _user, string memory _purpose) external view returns (bool);
    function getUserConsents(address _user) external view returns (Consent[] memory);
    function getUserConsentsCount(address _user) external view returns (uint256);
    function getUserConsentsPaginated(address _user, uint256 _offset, uint256 _limit) external view returns (Consent[] memory);
}
