// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IKantaraConsentReceipt {
    struct ConsentReceipt {
        bytes32 receiptId;
        address dataSubject;
        address dataController;
        uint8[] purposes;
        bytes32[] piCategories;
        uint8 consentType;
        uint256 timestamp;
        uint256 expiryTime;
        bool thirdPartyDisclosure;
        string policyUrl;
    }

    event ConsentGiven(bytes32 indexed receiptId, address indexed dataSubject, address indexed dataController);
    event ConsentRevoked(bytes32 indexed receiptId, address indexed dataSubject);

    function giveConsent(
        address _dataController,
        uint8[] memory _purposes,
        bytes32[] memory _piCategories,
        uint8 _consentType,
        uint256 _expiryTime,
        bool _thirdPartyDisclosure,
        string memory _policyUrl
    ) external returns (bytes32);

    function revokeConsent(bytes32 _receiptId) external;
    function isConsentValid(bytes32 _receiptId) external view returns (bool);
    function hasValidConsent(address _dataSubject, address _dataController, uint8 _purpose) external view returns (bool);
    function getConsentReceipt(bytes32 _receiptId) external view returns (ConsentReceipt memory);
    function getUserReceipts(address _user) external view returns (bytes32[] memory);
}
