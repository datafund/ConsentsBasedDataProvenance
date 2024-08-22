// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

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
        bytes32 dataController;
        Purpose[] purposes;
        bytes32[] piCategories;
        ConsentType consentType;
        uint256 expiryTime;
        bool thirdPartyDisclosure;
        bytes32 policyUrl;
    }

    mapping(bytes32 => ConsentReceipt) private consentReceipts;
    mapping(address => bytes32[]) private userReceipts;

    event ConsentGiven(bytes32 indexed receiptId, address indexed dataSubject, bytes32 indexed dataController);
    event ConsentRevoked(bytes32 indexed receiptId, address indexed dataSubject);

    function giveConsent(
        bytes32 _dataController,
        Purpose[] memory _purposes,
        bytes32[] memory _piCategories,
        ConsentType _consentType,
        uint256 _expiryTime,
        bool _thirdPartyDisclosure,
        bytes32 _policyUrl
    ) public returns (bytes32) {
        bytes32 receiptId = keccak256(abi.encodePacked(msg.sender, block.timestamp, _dataController));
        
        ConsentReceipt storage newReceipt = consentReceipts[receiptId];
        newReceipt.receiptId = receiptId;
        newReceipt.timestamp = block.timestamp;
        newReceipt.dataSubject = msg.sender;
        newReceipt.dataController = _dataController;
        newReceipt.purposes = _purposes;
        newReceipt.piCategories = _piCategories;
        newReceipt.consentType = _consentType;
        newReceipt.expiryTime = _expiryTime;
        newReceipt.thirdPartyDisclosure = _thirdPartyDisclosure;
        newReceipt.policyUrl = _policyUrl;

        userReceipts[msg.sender].push(receiptId);

        emit ConsentGiven(receiptId, msg.sender, _dataController);
        return receiptId;
    }

    function revokeConsent(bytes32 _receiptId) public {
        require(consentReceipts[_receiptId].dataSubject == msg.sender, "Not the consent owner");
        delete consentReceipts[_receiptId];

        // Remove receipt from userReceipts
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

    function getConsentReceipt(bytes32 _receiptId) public view returns (ConsentReceipt memory) {
        return consentReceipts[_receiptId];
    }

    function getUserReceipts(address _user) public view returns (bytes32[] memory) {
        return userReceipts[_user];
    }

    function isConsentValid(bytes32 _receiptId) public view returns (bool) {
        ConsentReceipt storage receipt = consentReceipts[_receiptId];
        return (receipt.dataSubject != address(0) && 
                (receipt.expiryTime == 0 || receipt.expiryTime > block.timestamp));
    }

    function hasValidConsent(address _dataSubject, bytes32 _dataController, Purpose _purpose) public view returns (bool) {
        bytes32[] memory receipts = userReceipts[_dataSubject];
        for (uint i = 0; i < receipts.length; i++) {
            ConsentReceipt storage receipt = consentReceipts[receipts[i]];
            if (receipt.dataController == _dataController && 
                isConsentValid(receipts[i])) {
                for (uint j = 0; j < receipt.purposes.length; j++) {
                    if (receipt.purposes[j] == _purpose) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
