// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract KantaraConsentReceipt {
    enum ConsentType {
        Express,
        Implicit,
        ThirdParty,
        Verbal,
        ExplicitAffirmative,    // Clear affirmative action by the data subject
        ImplicitOptOut,         // Consent inferred from non-action (opt-out)
        InformedExplicit,       // Explicit consent after being fully informed
        ParentalConsent,        // Consent given by a parent or guardian for a minor
        WrittenConsent,         // Consent provided in written form
        VerbalConsent,          // Consent provided verbally
        DigitalConsent,         // Consent provided through digital means (e.g., checkbox)
        DoubleOptIn,            // Two-step verification of consent
        BroadConsent,           // General consent for a broad range of purposes (e.g., for research)
        SpecificConsent,        // Consent for a specific, well-defined purpose
        DynamicConsent,         // Consent that can be modified over time by the data subject
        TieredConsent,          // Layered consent for different levels of data processing
        ConditionalConsent,     // Consent given with specific conditions
        WithdrawnConsent,       // Previously given consent that has been withdrawn
        ImpliedConsent,         // Consent inferred from actions or circumstances
        ProxyConsent,           // Consent given by a legally authorized representative
        PresumedConsent,        // Consent assumed based on specific circumstances (e.g., emergency)
        InformedImplicit,       // Implicit consent after being fully informed
        RenewedConsent,         // Consent that has been renewed after expiration
        LimitedConsent,         // Consent given for a limited time or specific occasion
        UnverifiedConsent,      // Consent that has not yet been verified
        ThirdPartyConsent,      // Consent for sharing data with third parties
        BundledConsent,         // Consent for multiple purposes bundled together
        GranularConsent,        // Separate consent for different data processing activities
        RetrospectiveConsent,   // Consent given after the data has already been collected
        Other                   // Other types of consent not covered above
    }


    enum Purpose {
        // Core Business Functions
        ServiceProvision,              // Providing the core service or product
        ContractFulfillment,           // Fulfilling contractual obligations
        CustomerSupport,               // Providing customer support and assistance
        AccountManagement,             // Managing user accounts and profiles
        TransactionProcessing,         // Processing financial transactions
        OrderFulfillment,              // Fulfilling orders and deliveries

        // Legal and Compliance
        LegalCompliance,               // Complying with legal obligations
        RegulatoryReporting,           // Reporting to regulatory bodies
        TaxCompliance,                 // Compliance with tax laws
        AuditingInternal,              // Internal auditing and compliance checks
        DisputeResolution,             // Handling legal disputes and proceedings

        // Security and Safety
        FraudPrevention,               // Detecting and preventing fraudulent activities
        IdentityVerification,          // Verifying user identities
        NetworkSecurity,               // Ensuring security of IT networks and systems
        PhysicalSecurity,              // Maintaining physical security of premises
        IncidentResponse,              // Responding to security incidents

        // Marketing and Communications
        DirectMarketing,               // Sending direct marketing communications
        AdvertisingPersonalization,    // Personalizing advertisements
        MarketResearch,                // Conducting market research and surveys
        CustomerFeedback,              // Collecting and analyzing customer feedback
        LoyaltyPrograms,               // Managing customer loyalty programs
        EventManagement,               // Organizing and managing events

        // Product and Service Improvement
        ProductDevelopment,            // Developing new products or services
        QualityAssurance,              // Ensuring quality of products or services
        UserExperienceOptimization,    // Optimizing user experience
        PerformanceAnalytics,          // Analyzing performance of products or services
        ABTesting,                     // Conducting A/B testing for improvements

        // Research and Analytics
        ScientificResearch,            // Conducting scientific research
        StatisticalAnalysis,           // Performing statistical analysis
        MarketAnalysis,                // Analyzing market trends and behaviors
        BusinessIntelligence,          // Generating business intelligence insights
        PredictiveModeling,            // Creating predictive models

        // Personalization and User Experience
        ContentPersonalization,        // Personalizing content for users
        ServiceCustomization,          // Customizing services for individual needs
        RecommendationSystems,         // Providing personalized recommendations
        UserPreferences,               // Storing and applying user preferences

        // Technical and Operational
        TechnicalSupport,              // Providing technical support
        SystemMaintenance,             // Maintaining and updating systems
        PerformanceMonitoring,         // Monitoring system performance
        ErrorTracking,                 // Tracking and resolving errors
        BackupRecovery,                // Backing up and recovering data
        LoadBalancing,                 // Managing server load and traffic

        // Human Resources
        EmployeeManagement,            // Managing employee data and processes
        PayrollProcessing,             // Processing payroll
        RecruitmentHiring,             // Managing recruitment and hiring processes
        PerformanceEvaluation,         // Evaluating employee performance
        TrainingDevelopment,           // Providing employee training and development
        WorkforceAnalytics,            // Analyzing workforce data

        // Financial Management
        BillingInvoicing,              // Managing billing and invoicing
        DebtCollection,                // Collecting outstanding debts
        FinancialPlanning,             // Financial planning and analysis
        RiskAssessment,                // Assessing financial risks
        CreditScoring,                 // Determining credit scores
        AssetManagement,               // Managing company assets

        // Communication
        InternalCommunication,         // Facilitating internal company communications
        ExternalCommunication,         // Managing external communications
        EmergencyNotification,         // Sending emergency notifications
        NewsletterDistribution,        // Distributing newsletters
        SurveyAdministration,          // Administering surveys and polls

        // Social and Community
        SocialNetworking,              // Facilitating social networking features
        CommunityModeration,           // Moderating online communities
        UserContentManagement,         // Managing user-generated content
        CollaborationTools,            // Providing collaboration tools and platforms

        // Education and Training
        EducationalContentDelivery,    // Delivering educational content
        StudentProgressTracking,       // Tracking student progress
        AssessmentEvaluation,          // Conducting assessments and evaluations
        CertificationManagement,       // Managing certifications and credentials

        // Healthcare
        PatientCareManagement,         // Managing patient care and records
        HealthMonitoring,              // Monitoring health and wellness data
        TelehealthServices,            // Providing telehealth services
        MedicalResearch,               // Conducting medical research
        PharmaceuticalDevelopment,     // Developing pharmaceutical products

        // IoT and Smart Devices
        DeviceManagement,              // Managing IoT and smart devices
        EnvironmentalMonitoring,       // Monitoring environmental conditions
        EnergyManagement,              // Managing energy usage and efficiency
        PredictiveMaintenance,         // Predicting maintenance needs

        // Location-Based Services
        GeolocationTracking,           // Tracking geolocation
        NavigationServices,            // Providing navigation and mapping services
        ProximityMarketing,            // Delivering location-based marketing
        AssetTracking,                 // Tracking location of assets

        // Content and Media
        ContentDelivery,               // Delivering digital content
        StreamingServices,             // Providing streaming services
        DigitalRightsManagement,       // Managing digital rights
        ContentRecommendation,         // Recommending content to users

        // Artificial Intelligence
        MachineLearning,               // Developing and applying machine learning models
        NaturalLanguageProcessing,     // Processing and analyzing natural language
        ComputerVision,                // Analyzing visual data
        PredictiveAnalytics,           // Performing predictive analytics

        // Blockchain and Cryptocurrency
        CryptocurrencyTransactions,    // Processing cryptocurrency transactions
        SmartContractExecution,        // Executing smart contracts
        DecentralizedIdentity,         // Managing decentralized identities

        // Miscellaneous
        DisasterRecovery,              // Planning and executing disaster recovery
        SustainabilityInitiatives,     // Supporting sustainability initiatives
        CorporateSocialResponsibility, // Managing corporate social responsibility programs
        PartnershipManagement,         // Managing business partnerships
        RegulatoryCompliance,          // Ensuring compliance with industry regulations
        IntellectualPropertyProtection,// Protecting intellectual property

        // Catchall
        OtherPurpose                   // Any other purpose not covered above
    }

    struct ConsentReceipt {
        bytes32 receiptId;
        uint256 timestamp;
        address dataSubject;
        address dataController;  // Changed from bytes32 to address
        Purpose[] purposes;
        bytes32[] piCategories;
        ConsentType consentType;
        uint256 expiryTime;
        bool thirdPartyDisclosure;
        string policyUrl;  // Changed from bytes32 to string for better usability
    }

    // Security: Nonce for unique receipt IDs
    mapping(address => uint256) private userNonces;
    mapping(bytes32 => ConsentReceipt) private consentReceipts;
    mapping(address => bytes32[]) private userReceipts;
    // Optimization: Track receipts by (subject, controller, purpose) for faster hasValidConsent lookup
    mapping(address => mapping(address => mapping(Purpose => bytes32[]))) private controllerPurposeReceipts;

    event ConsentGiven(
        bytes32 indexed receiptId,
        address indexed dataSubject,
        address indexed dataController,
        uint256 expiryTime
    );
    event ConsentRevoked(bytes32 indexed receiptId, address indexed dataSubject);
    event ConsentUpdated(bytes32 indexed receiptId, address indexed dataSubject);

    /// @notice Give consent with full Kantara-compliant receipt
    /// @param _dataController Address of data controller
    /// @param _purposes Array of purposes for consent
    /// @param _piCategories Array of PI category hashes
    /// @param _consentType Type of consent
    /// @param _expiryTime Expiry timestamp (0 = no expiry)
    /// @param _thirdPartyDisclosure Whether third-party disclosure is allowed
    /// @param _policyUrl URL to privacy policy
    /// @return bytes32 The receipt ID
    function giveConsent(
        address _dataController,
        Purpose[] memory _purposes,
        bytes32[] memory _piCategories,
        ConsentType _consentType,
        uint256 _expiryTime,
        bool _thirdPartyDisclosure,
        string memory _policyUrl
    ) public returns (bytes32) {
        require(_dataController != address(0), "Invalid data controller");
        require(_purposes.length > 0, "At least one purpose required");
        require(_purposes.length <= 20, "Too many purposes");
        require(_piCategories.length <= 50, "Too many PI categories");
        require(bytes(_policyUrl).length <= 512, "Policy URL too long");
        require(_expiryTime == 0 || _expiryTime > block.timestamp, "Expiry must be in future");

        // Security: Use nonce for unique receipt ID
        uint256 nonce = userNonces[msg.sender]++;
        bytes32 receiptId = keccak256(
            abi.encodePacked(msg.sender, block.timestamp, _dataController, nonce)
        );

        ConsentReceipt storage newReceipt = consentReceipts[receiptId];
        newReceipt.receiptId = receiptId;
        newReceipt.timestamp = block.timestamp;
        newReceipt.dataSubject = msg.sender;
        newReceipt.dataController = _dataController;
        newReceipt.consentType = _consentType;
        newReceipt.expiryTime = _expiryTime;
        newReceipt.thirdPartyDisclosure = _thirdPartyDisclosure;
        newReceipt.policyUrl = _policyUrl;

        // Copy arrays and track for optimization
        for (uint256 i = 0; i < _purposes.length; i++) {
            newReceipt.purposes.push(_purposes[i]);
            // Optimization: Track receipt by (subject, controller, purpose) for faster lookup
            controllerPurposeReceipts[msg.sender][_dataController][_purposes[i]].push(receiptId);
        }
        for (uint256 i = 0; i < _piCategories.length; i++) {
            newReceipt.piCategories.push(_piCategories[i]);
        }

        userReceipts[msg.sender].push(receiptId);

        emit ConsentGiven(receiptId, msg.sender, _dataController, _expiryTime);
        return receiptId;
    }

    /// @notice Revoke consent by receipt ID
    /// @param _receiptId The receipt ID to revoke
    function revokeConsent(bytes32 _receiptId) public {
        require(consentReceipts[_receiptId].dataSubject == msg.sender, "Not the consent owner");
        delete consentReceipts[_receiptId];

        // Remove receipt from userReceipts (swap and pop)
        bytes32[] storage receipts = userReceipts[msg.sender];
        for (uint i = 0; i < receipts.length; i++) {
            if (receipts[i] == _receiptId) {
                receipts[i] = receipts[receipts.length - 1];
                receipts.pop();
                break;
            }
        }

        emit ConsentRevoked(_receiptId, msg.sender);
    }

    /// @notice Get consent receipt details
    /// @param _receiptId The receipt ID
    /// @return ConsentReceipt The receipt data
    function getConsentReceipt(bytes32 _receiptId) public view returns (ConsentReceipt memory) {
        return consentReceipts[_receiptId];
    }

    /// @notice Get all receipt IDs for a user
    /// @param _user User address
    /// @return bytes32[] Array of receipt IDs
    function getUserReceipts(address _user) public view returns (bytes32[] memory) {
        return userReceipts[_user];
    }

    /// @notice Get paginated receipt IDs for a user
    /// @param _user User address
    /// @param _offset Starting index
    /// @param _limit Maximum results
    /// @return bytes32[] Array of receipt IDs
    function getUserReceiptsPaginated(
        address _user,
        uint256 _offset,
        uint256 _limit
    ) public view returns (bytes32[] memory) {
        bytes32[] storage allReceipts = userReceipts[_user];

        if (_offset >= allReceipts.length) {
            return new bytes32[](0);
        }

        uint256 end = _offset + _limit;
        if (end > allReceipts.length) {
            end = allReceipts.length;
        }

        uint256 resultLength = end - _offset;
        bytes32[] memory result = new bytes32[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = allReceipts[_offset + i];
        }

        return result;
    }

    /// @notice Check if consent receipt is valid (exists and not expired)
    /// @param _receiptId The receipt ID
    /// @return bool True if valid
    function isConsentValid(bytes32 _receiptId) public view returns (bool) {
        ConsentReceipt storage receipt = consentReceipts[_receiptId];
        return (receipt.dataSubject != address(0) &&
                (receipt.expiryTime == 0 || receipt.expiryTime > block.timestamp));
    }

    /// @notice Check if user has valid consent for a specific purpose with a data controller
    /// @dev Optimized: Uses index mapping instead of iterating through all receipts and purposes
    /// @param _dataSubject User address
    /// @param _dataController Data controller address
    /// @param _purpose Purpose to check
    /// @return bool True if valid consent exists
    function hasValidConsent(
        address _dataSubject,
        address _dataController,
        Purpose _purpose
    ) public view returns (bool) {
        // Optimization: Only check receipts for this specific (subject, controller, purpose) combination
        bytes32[] memory receiptIds = controllerPurposeReceipts[_dataSubject][_dataController][_purpose];
        for (uint256 i = 0; i < receiptIds.length; i++) {
            if (isConsentValid(receiptIds[i])) {
                return true;
            }
        }
        return false;
    }

    /// @notice Get count of user receipts
    /// @param _user User address
    /// @return uint256 Count
    function getUserReceiptsCount(address _user) public view returns (uint256) {
        return userReceipts[_user].length;
    }

    /// @notice Get user's current nonce (for verification)
    /// @param _user User address
    /// @return uint256 Current nonce
    function getUserNonce(address _user) public view returns (uint256) {
        return userNonces[_user];
    }

    // ============ Batch Operations ============

    /// @notice Revoke multiple consent receipts in a single transaction
    /// @param _receiptIds Array of receipt IDs to revoke
    function batchRevokeConsent(bytes32[] memory _receiptIds) public {
        require(_receiptIds.length > 0, "Empty receipt IDs array");
        require(_receiptIds.length <= 50, "Too many receipts");

        for (uint256 i = 0; i < _receiptIds.length; i++) {
            revokeConsent(_receiptIds[i]);
        }
    }

    /// @notice Check validity of multiple receipts in a single call
    /// @param _receiptIds Array of receipt IDs to check
    /// @return bool[] Array of validity results
    function batchIsConsentValid(bytes32[] memory _receiptIds) public view returns (bool[] memory) {
        require(_receiptIds.length > 0, "Empty receipt IDs array");
        require(_receiptIds.length <= 100, "Too many receipts");

        bool[] memory results = new bool[](_receiptIds.length);
        for (uint256 i = 0; i < _receiptIds.length; i++) {
            results[i] = isConsentValid(_receiptIds[i]);
        }
        return results;
    }
}
