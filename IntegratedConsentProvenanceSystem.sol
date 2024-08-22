// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ConsentReceipt.sol";
import "./DataProvenance.sol";

contract IntegratedConsentProvenanceSystem {
    ConsentReceipt public consentContract;
    DataProvenance public provenanceContract;

    constructor(address _consentContractAddress, address _provenanceContractAddress) {
        consentContract = ConsentReceipt(_consentContractAddress);
        provenanceContract = DataProvenance(_provenanceContractAddress);
    }

    event DataRegisteredWithConsent(bytes32 indexed dataHash, address indexed owner, string dataType, string consentPurpose);
    event DataAccessedWithConsent(bytes32 indexed dataHash, address indexed accessor, string consentPurpose);

    function registerDataWithConsent(bytes32 _dataHash, string memory _dataType, string memory _consentPurpose) public {
        require(consentContract.getConsentStatus(msg.sender, _consentPurpose), "No valid consent for this purpose");

        provenanceContract.registerData(_dataHash, _dataType);
        emit DataRegisteredWithConsent(_dataHash, msg.sender, _dataType, _consentPurpose);
    }

    function accessDataWithConsent(bytes32 _dataHash, string memory _consentPurpose) public {
        require(consentContract.getConsentStatus(msg.sender, _consentPurpose), "No valid consent for this purpose");

        provenanceContract.recordAccess(_dataHash);
        emit DataAccessedWithConsent(_dataHash, msg.sender, _consentPurpose);
    }

    function transformDataWithConsent(bytes32 _originalDataHash, bytes32 _newDataHash, string memory _transformation, string memory _consentPurpose) public {
        require(consentContract.getConsentStatus(msg.sender, _consentPurpose), "No valid consent for this purpose");

        provenanceContract.recordTransformation(_originalDataHash, _newDataHash, _transformation);
    }

    function revokeConsentAndInvalidateData(uint256 _consentIndex) public {
        consentContract.revokeConsent(_consentIndex);
        // Here you might want to add logic to invalidate or restrict access to associated data
        // This could involve updating the DataProvenance contract or emitting events
    }

    // Additional helper functions can be added here to query both contracts
}
