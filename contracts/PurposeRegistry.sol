// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract PurposeRegistry {
    struct PurposeInfo {
        bytes32 purposeId;
        string name;
        string description;
        bool isActive;
        uint256 registeredAt;
    }

    mapping(bytes32 => PurposeInfo) public purposes;
    bytes32[] public purposeList;
    address public admin;

    bytes32 public constant SERVICE_PROVISION = keccak256("ServiceProvision");
    bytes32 public constant CONTRACT_PERFORMANCE = keccak256("ContractPerformance");
    bytes32 public constant DIRECT_MARKETING = keccak256("DirectMarketing");
    bytes32 public constant PROFILING = keccak256("Profiling");
    bytes32 public constant SCIENTIFIC_RESEARCH = keccak256("ScientificResearch");
    bytes32 public constant STATISTICAL_ANALYSIS = keccak256("StatisticalAnalysis");
    bytes32 public constant LEGAL_COMPLIANCE = keccak256("LegalCompliance");
    bytes32 public constant VITAL_INTERESTS = keccak256("VitalInterests");
    bytes32 public constant PUBLIC_INTEREST = keccak256("PublicInterest");
    bytes32 public constant LEGITIMATE_INTERESTS = keccak256("LegitimateInterests");

    event PurposeRegistered(bytes32 indexed purposeId, string name);
    event PurposeDeactivated(bytes32 indexed purposeId);
    event PurposeReactivated(bytes32 indexed purposeId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;

        _registerCorePurpose(SERVICE_PROVISION, "Service Provision", "Processing necessary to provide requested services");
        _registerCorePurpose(CONTRACT_PERFORMANCE, "Contract Performance", "Processing necessary for contract execution");
        _registerCorePurpose(DIRECT_MARKETING, "Direct Marketing", "Sending promotional materials to data subjects");
        _registerCorePurpose(PROFILING, "Profiling", "Automated processing to evaluate personal aspects");
        _registerCorePurpose(SCIENTIFIC_RESEARCH, "Scientific Research", "Processing for scientific or historical research");
        _registerCorePurpose(STATISTICAL_ANALYSIS, "Statistical Analysis", "Processing for statistical purposes");
        _registerCorePurpose(LEGAL_COMPLIANCE, "Legal Compliance", "Processing required by law");
        _registerCorePurpose(VITAL_INTERESTS, "Vital Interests", "Processing to protect vital interests");
        _registerCorePurpose(PUBLIC_INTEREST, "Public Interest", "Processing in the public interest");
        _registerCorePurpose(LEGITIMATE_INTERESTS, "Legitimate Interests", "Processing for legitimate business interests");
    }

    function _registerCorePurpose(bytes32 _id, string memory _name, string memory _description) private {
        purposes[_id] = PurposeInfo({
            purposeId: _id,
            name: _name,
            description: _description,
            isActive: true,
            registeredAt: block.timestamp
        });
        purposeList.push(_id);
    }

    function registerPurpose(string memory _name, string memory _description)
        external onlyAdmin returns (bytes32)
    {
        bytes32 purposeId = keccak256(bytes(_name));
        require(purposes[purposeId].registeredAt == 0, "Purpose already exists");

        purposes[purposeId] = PurposeInfo({
            purposeId: purposeId,
            name: _name,
            description: _description,
            isActive: true,
            registeredAt: block.timestamp
        });
        purposeList.push(purposeId);

        emit PurposeRegistered(purposeId, _name);
        return purposeId;
    }

    function deactivatePurpose(bytes32 _purposeId) external onlyAdmin {
        require(purposes[_purposeId].isActive, "Purpose not active");
        purposes[_purposeId].isActive = false;
        emit PurposeDeactivated(_purposeId);
    }

    function reactivatePurpose(bytes32 _purposeId) external onlyAdmin {
        require(!purposes[_purposeId].isActive, "Purpose already active");
        require(purposes[_purposeId].registeredAt != 0, "Purpose does not exist");
        purposes[_purposeId].isActive = true;
        emit PurposeReactivated(_purposeId);
    }

    function isPurposeValid(bytes32 _purposeId) external view returns (bool) {
        return purposes[_purposeId].isActive;
    }

    function getPurpose(bytes32 _purposeId) external view returns (PurposeInfo memory) {
        return purposes[_purposeId];
    }

    function getPurposeIdByName(string memory _name) external pure returns (bytes32) {
        return keccak256(bytes(_name));
    }

    function getAllPurposes() external view returns (bytes32[] memory) {
        return purposeList;
    }

    function getPurposeCount() external view returns (uint256) {
        return purposeList.length;
    }

    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin");
        admin = _newAdmin;
    }
}
