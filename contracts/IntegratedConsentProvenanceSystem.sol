// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "./ConsentReceipt.sol";
import "./DataProvenance.sol";

contract IntegratedConsentProvenanceSystem {
    ConsentReceipt public consentContract;
    DataProvenance public provenanceContract;

    // Track which consent was used for each data operation
    mapping(bytes32 => string) public dataConsentPurpose;

    // Track data registered by each user through this contract
    mapping(address => bytes32[]) private userRegisteredData;

    event DataRegisteredWithConsent(
        bytes32 indexed dataHash,
        address indexed owner,
        string dataType,
        string consentPurpose
    );
    event DelegatedDataRegistered(
        bytes32 indexed dataHash,
        address indexed actualOwner,
        address indexed delegate,
        string dataType,
        string consentPurpose
    );
    event DataAccessedWithConsent(
        bytes32 indexed dataHash,
        address indexed accessor,
        string consentPurpose
    );
    event DataTransformedWithConsent(
        bytes32 indexed originalDataHash,
        bytes32 indexed newDataHash,
        string transformation,
        string consentPurpose
    );
    event ConsentRevokedWithDataRestriction(
        address indexed user,
        uint256 consentIndex,
        uint256 restrictedDataCount
    );

    /// @notice Constructor with validation
    /// @param _consentContractAddress Address of ConsentReceipt contract
    /// @param _provenanceContractAddress Address of DataProvenance contract
    constructor(address _consentContractAddress, address _provenanceContractAddress) {
        require(_consentContractAddress != address(0), "Invalid consent contract address");
        require(_provenanceContractAddress != address(0), "Invalid provenance contract address");
        consentContract = ConsentReceipt(_consentContractAddress);
        provenanceContract = DataProvenance(_provenanceContractAddress);
    }

    /// @notice Register data with consent verification
    /// @param _dataHash Hash of data to register
    /// @param _dataType Type of data
    /// @param _consentPurpose Purpose that must have valid consent
    function registerDataWithConsent(
        bytes32 _dataHash,
        string memory _dataType,
        string memory _consentPurpose
    ) public {
        require(
            consentContract.getConsentStatus(msg.sender, _consentPurpose),
            "No valid consent for this purpose"
        );

        provenanceContract.registerData(_dataHash, _dataType);
        dataConsentPurpose[_dataHash] = _consentPurpose;
        userRegisteredData[msg.sender].push(_dataHash);

        emit DataRegisteredWithConsent(_dataHash, msg.sender, _dataType, _consentPurpose);
    }

    /// @notice Register data on behalf of another user (delegated registration)
    /// @param _dataHash Hash of data to register
    /// @param _dataType Type of data
    /// @param _consentPurpose Purpose that must have valid consent
    /// @param _actualOwner The actual owner of the data
    function registerDataForWithConsent(
        bytes32 _dataHash,
        string memory _dataType,
        string memory _consentPurpose,
        address _actualOwner
    ) public {
        // Verify delegate is authorized by the actual owner
        require(
            provenanceContract.isAuthorizedDelegate(_actualOwner, msg.sender),
            "Not authorized delegate"
        );

        // Verify the actual owner has valid consent
        require(
            consentContract.getConsentStatus(_actualOwner, _consentPurpose),
            "Owner has no valid consent for this purpose"
        );

        provenanceContract.registerDataFor(_dataHash, _dataType, _actualOwner);
        dataConsentPurpose[_dataHash] = _consentPurpose;
        userRegisteredData[_actualOwner].push(_dataHash);

        emit DelegatedDataRegistered(_dataHash, _actualOwner, msg.sender, _dataType, _consentPurpose);
    }

    /// @notice Access data with consent verification
    /// @param _dataHash Hash of data to access
    /// @param _consentPurpose Purpose that must have valid consent
    function accessDataWithConsent(bytes32 _dataHash, string memory _consentPurpose) public {
        require(
            consentContract.getConsentStatus(msg.sender, _consentPurpose),
            "No valid consent for this purpose"
        );

        provenanceContract.recordAccess(_dataHash);
        emit DataAccessedWithConsent(_dataHash, msg.sender, _consentPurpose);
    }

    /// @notice Transform data with consent verification
    /// @param _originalDataHash Hash of original data
    /// @param _newDataHash Hash of transformed data
    /// @param _transformation Transformation description
    /// @param _consentPurpose Purpose that must have valid consent
    function transformDataWithConsent(
        bytes32 _originalDataHash,
        bytes32 _newDataHash,
        string memory _transformation,
        string memory _consentPurpose
    ) public {
        require(
            consentContract.getConsentStatus(msg.sender, _consentPurpose),
            "No valid consent for this purpose"
        );

        provenanceContract.recordTransformation(_originalDataHash, _newDataHash, _transformation);
        dataConsentPurpose[_newDataHash] = _consentPurpose;
        userRegisteredData[msg.sender].push(_newDataHash);

        emit DataTransformedWithConsent(
            _originalDataHash,
            _newDataHash,
            _transformation,
            _consentPurpose
        );
    }

    /// @notice Revoke consent - user must call ConsentReceipt directly
    /// @dev This function is removed as it was a security vulnerability.
    ///      Users should call consentContract.revokeConsent() directly.
    ///      Data invalidation must be handled separately by the data owner.

    /// @notice Restrict data associated with a purpose after consent revocation
    /// @dev Call this after revoking consent to restrict associated data
    /// @param _consentPurpose The purpose whose data should be restricted
    function restrictDataForPurpose(string memory _consentPurpose) public {
        // Verify user doesn't have valid consent anymore (they revoked it)
        require(
            !consentContract.getConsentStatus(msg.sender, _consentPurpose),
            "Consent still valid"
        );

        // Use userRegisteredData which tracks data registered through this contract
        bytes32[] memory userDataHashes = userRegisteredData[msg.sender];
        uint256 restrictedCount = 0;

        for (uint256 i = 0; i < userDataHashes.length; i++) {
            bytes32 dataHash = userDataHashes[i];
            // Check if this data was registered under the revoked consent purpose
            if (keccak256(bytes(dataConsentPurpose[dataHash])) == keccak256(bytes(_consentPurpose))) {
                // This contract is the owner in DataProvenance, so setDataStatus will work
                try provenanceContract.setDataStatus(dataHash, DataProvenance.DataStatus.Restricted) {
                    restrictedCount++;
                } catch {
                    // Data status might already be restricted or deleted, skip
                }
            }
        }

        emit ConsentRevokedWithDataRestriction(msg.sender, 0, restrictedCount);
    }

    /// @notice Get user's registered data hashes through this contract
    /// @param _user User address
    /// @return bytes32[] Array of data hashes
    function getUserRegisteredData(address _user) public view returns (bytes32[] memory) {
        return userRegisteredData[_user];
    }

    /// @notice Get the consent purpose associated with data
    /// @param _dataHash Hash of data
    /// @return string The consent purpose
    function getDataConsentPurpose(bytes32 _dataHash) public view returns (string memory) {
        return dataConsentPurpose[_dataHash];
    }

    /// @notice Check if data access is allowed (has valid consent)
    /// @param _user User address
    /// @param _dataHash Data hash
    /// @return bool True if access allowed
    function isDataAccessAllowed(address _user, bytes32 _dataHash) public view returns (bool) {
        string memory purpose = dataConsentPurpose[_dataHash];
        if (bytes(purpose).length == 0) {
            return false;
        }
        return consentContract.getConsentStatus(_user, purpose);
    }
}
