/**
 * Shared Constants
 *
 * Industry-specific constants and realistic data values
 * used across example scenarios.
 */

import { ethers } from "hardhat";

// ============================================================
// Time Constants
// ============================================================

export const TIME = {
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 24 * 60 * 60,
  WEEK: 7 * 24 * 60 * 60,
  MONTH: 30 * 24 * 60 * 60,
  YEAR: 365 * 24 * 60 * 60
};

// ============================================================
// Healthcare Constants
// ============================================================

export const HEALTHCARE = {
  purposes: {
    TREATMENT: "medical_treatment",
    INSURANCE_BILLING: "insurance_billing",
    RESEARCH: "medical_research",
    EMERGENCY: "emergency_care",
    REFERRAL: "specialist_referral",
    LAB_RESULTS: "lab_results_sharing",
    PHARMACY: "pharmacy_prescription",
    FAMILY_HISTORY: "family_medical_history"
  },
  dataTypes: {
    PATIENT_RECORD: "patient_medical_record",
    LAB_RESULT: "laboratory_result",
    PRESCRIPTION: "prescription",
    IMAGING: "medical_imaging",
    VITAL_SIGNS: "vital_signs",
    DIAGNOSIS: "diagnosis_report",
    TREATMENT_PLAN: "treatment_plan"
  },
  piCategories: [
    ethers.keccak256(ethers.toUtf8Bytes("name")),
    ethers.keccak256(ethers.toUtf8Bytes("date_of_birth")),
    ethers.keccak256(ethers.toUtf8Bytes("ssn")),
    ethers.keccak256(ethers.toUtf8Bytes("medical_record_number")),
    ethers.keccak256(ethers.toUtf8Bytes("diagnosis_codes")),
    ethers.keccak256(ethers.toUtf8Bytes("treatment_history"))
  ]
};

// ============================================================
// Financial Services Constants
// ============================================================

export const FINANCE = {
  purposes: {
    KYC: "know_your_customer",
    CREDIT_CHECK: "credit_check",
    LOAN_PROCESSING: "loan_processing",
    FRAUD_DETECTION: "fraud_detection",
    MARKETING: "financial_marketing",
    TAX_REPORTING: "tax_reporting",
    REGULATORY_COMPLIANCE: "regulatory_compliance",
    ACCOUNT_MANAGEMENT: "account_management"
  },
  dataTypes: {
    APPLICATION: "loan_application",
    CREDIT_REPORT: "credit_report",
    TRANSACTION: "financial_transaction",
    IDENTITY_DOC: "identity_document",
    INCOME_PROOF: "income_verification",
    ACCOUNT_STATEMENT: "account_statement"
  },
  piCategories: [
    ethers.keccak256(ethers.toUtf8Bytes("full_name")),
    ethers.keccak256(ethers.toUtf8Bytes("ssn")),
    ethers.keccak256(ethers.toUtf8Bytes("address")),
    ethers.keccak256(ethers.toUtf8Bytes("income")),
    ethers.keccak256(ethers.toUtf8Bytes("employment")),
    ethers.keccak256(ethers.toUtf8Bytes("credit_score")),
    ethers.keccak256(ethers.toUtf8Bytes("account_numbers"))
  ]
};

// ============================================================
// Marketing Constants
// ============================================================

export const MARKETING = {
  purposes: {
    EMAIL_MARKETING: "email_marketing",
    SMS_MARKETING: "sms_marketing",
    PUSH_NOTIFICATIONS: "push_notifications",
    PERSONALIZATION: "ad_personalization",
    ANALYTICS: "website_analytics",
    COOKIES: "cookie_tracking",
    THIRD_PARTY_ADS: "third_party_advertising",
    RETARGETING: "retargeting",
    SURVEYS: "customer_surveys",
    LOYALTY: "loyalty_program"
  },
  dataTypes: {
    EMAIL_PREFERENCE: "email_preference",
    BROWSING_HISTORY: "browsing_history",
    PURCHASE_HISTORY: "purchase_history",
    USER_PROFILE: "user_profile",
    DEVICE_INFO: "device_information",
    LOCATION_DATA: "location_data"
  },
  piCategories: [
    ethers.keccak256(ethers.toUtf8Bytes("email")),
    ethers.keccak256(ethers.toUtf8Bytes("phone")),
    ethers.keccak256(ethers.toUtf8Bytes("device_id")),
    ethers.keccak256(ethers.toUtf8Bytes("ip_address")),
    ethers.keccak256(ethers.toUtf8Bytes("location")),
    ethers.keccak256(ethers.toUtf8Bytes("interests"))
  ]
};

// ============================================================
// Research Constants
// ============================================================

export const RESEARCH = {
  purposes: {
    STUDY_PARTICIPATION: "study_participation",
    DATA_COLLECTION: "research_data_collection",
    BIOBANK: "biobank_storage",
    PUBLICATION: "research_publication",
    SECONDARY_USE: "secondary_research_use",
    COLLABORATION: "inter_institution_sharing",
    ANONYMIZED_ANALYSIS: "anonymized_analysis"
  },
  dataTypes: {
    SURVEY_RESPONSE: "survey_response",
    BIOMETRIC_DATA: "biometric_data",
    GENETIC_DATA: "genetic_data",
    BEHAVIORAL_DATA: "behavioral_data",
    AGGREGATED_STATS: "aggregated_statistics",
    ANONYMIZED_DATASET: "anonymized_dataset"
  },
  transformations: {
    ANONYMIZATION: "data_anonymization",
    AGGREGATION: "data_aggregation",
    PSEUDONYMIZATION: "pseudonymization",
    ENCRYPTION: "data_encryption",
    CLEANING: "data_cleaning",
    NORMALIZATION: "data_normalization"
  }
};

// ============================================================
// IoT / Supply Chain Constants
// ============================================================

export const IOT_SUPPLY_CHAIN = {
  purposes: {
    DEVICE_MONITORING: "device_monitoring",
    PREDICTIVE_MAINTENANCE: "predictive_maintenance",
    TRAFFIC_ANALYSIS: "traffic_analysis",
    ENVIRONMENTAL_MONITORING: "environmental_monitoring",
    INVENTORY_TRACKING: "inventory_tracking",
    QUALITY_CONTROL: "quality_control",
    LOGISTICS: "logistics_optimization"
  },
  dataTypes: {
    SENSOR_READING: "sensor_reading",
    DEVICE_STATUS: "device_status",
    GPS_LOCATION: "gps_location",
    TEMPERATURE_LOG: "temperature_log",
    PRODUCT_BATCH: "product_batch",
    SHIPMENT: "shipment_record",
    MANUFACTURING_STEP: "manufacturing_step"
  },
  transformations: {
    RAW_TO_PROCESSED: "raw_to_processed",
    AGGREGATED_METRICS: "aggregated_metrics",
    QUALITY_CHECK: "quality_check_passed",
    PACKAGING: "packaging_completed",
    SHIPPING: "shipped_to_destination"
  }
};

// ============================================================
// Kantara Consent Types (matching contract enum)
// ============================================================

export const CONSENT_TYPES = {
  EXPRESS: 0,
  IMPLICIT: 1,
  THIRD_PARTY: 2,
  VERBAL: 3,
  EXPLICIT_AFFIRMATIVE: 4,
  IMPLICIT_OPT_OUT: 5,
  INFORMED_EXPLICIT: 6,
  PARENTAL_CONSENT: 7,
  WRITTEN_CONSENT: 8,
  VERBAL_CONSENT: 9,
  DIGITAL_CONSENT: 10,
  DOUBLE_OPT_IN: 11,
  BROAD_CONSENT: 12,
  SPECIFIC_CONSENT: 13,
  DYNAMIC_CONSENT: 14,
  TIERED_CONSENT: 15,
  CONDITIONAL_CONSENT: 16,
  WITHDRAWN_CONSENT: 17,
  IMPLIED_CONSENT: 18,
  PROXY_CONSENT: 19,
  PRESUMED_CONSENT: 20,
  INFORMED_IMPLICIT: 21,
  RENEWED_CONSENT: 22,
  LIMITED_CONSENT: 23,
  UNVERIFIED_CONSENT: 24,
  THIRD_PARTY_CONSENT: 25,
  BUNDLED_CONSENT: 26,
  GRANULAR_CONSENT: 27,
  RETROSPECTIVE_CONSENT: 28,
  OTHER: 29
};

// ============================================================
// Kantara Purpose Types (matching contract enum)
// ============================================================

export const KANTARA_PURPOSES = {
  // Core Business
  SERVICE_PROVISION: 0,
  CONTRACT_FULFILLMENT: 1,
  CUSTOMER_SUPPORT: 2,
  ACCOUNT_MANAGEMENT: 3,
  TRANSACTION_PROCESSING: 4,
  ORDER_FULFILLMENT: 5,

  // Legal
  LEGAL_COMPLIANCE: 6,
  REGULATORY_REPORTING: 7,
  TAX_COMPLIANCE: 8,
  AUDITING_INTERNAL: 9,
  DISPUTE_RESOLUTION: 10,

  // Security
  FRAUD_PREVENTION: 11,
  IDENTITY_VERIFICATION: 12,
  NETWORK_SECURITY: 13,
  PHYSICAL_SECURITY: 14,
  INCIDENT_RESPONSE: 15,

  // Marketing
  DIRECT_MARKETING: 16,
  ADVERTISING_PERSONALIZATION: 17,
  MARKET_RESEARCH: 18,
  CUSTOMER_FEEDBACK: 19,
  LOYALTY_PROGRAMS: 20,
  EVENT_MANAGEMENT: 21,

  // Product Development
  PRODUCT_DEVELOPMENT: 22,
  QUALITY_ASSURANCE: 23,
  USER_EXPERIENCE_OPTIMIZATION: 24,
  PERFORMANCE_ANALYTICS: 25,
  AB_TESTING: 26,

  // Research
  SCIENTIFIC_RESEARCH: 27,
  STATISTICAL_ANALYSIS: 28,
  MARKET_ANALYSIS: 29,
  BUSINESS_INTELLIGENCE: 30,
  PREDICTIVE_MODELING: 31,

  // Healthcare
  PATIENT_CARE_MANAGEMENT: 51,
  HEALTH_MONITORING: 52,
  TELEHEALTH_SERVICES: 53,
  MEDICAL_RESEARCH: 54,
  PHARMACEUTICAL_DEVELOPMENT: 55
};

// ============================================================
// Data Status (matching contract enum)
// ============================================================

export const DATA_STATUS = {
  ACTIVE: 0,
  RESTRICTED: 1,
  DELETED: 2
};

// ============================================================
// Access Levels (matching DataAccessControl contract)
// ============================================================

export const ACCESS_LEVELS = {
  NONE: 0,
  READ: 1,
  TRANSFORM: 2,
  FULL: 3
};

// ============================================================
// Audit Actions (matching ConsentAuditLog contract)
// ============================================================

export const AUDIT_ACTIONS = {
  CONSENT_GIVEN: 0,
  CONSENT_REVOKED: 1,
  CONSENT_EXPIRED: 2,
  DATA_REGISTERED: 3,
  DATA_ACCESSED: 4,
  DATA_TRANSFORMED: 5,
  DATA_RESTRICTED: 6,
  DATA_DELETED: 7,
  OWNERSHIP_TRANSFERRED: 8,
  ACCESS_GRANTED: 9,
  ACCESS_REVOKED: 10
};
