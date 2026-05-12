// Frontend-readable snapshot of the safe source registry.
// Source of truth remains qbank_pipeline/source_registry.json; keep this subset synced for AdminReview visibility.
export const SOURCE_REGISTRY_SNAPSHOT = [
  {
    sourceId: "ncsbn-2026-pn-test-plan",
    title: "NCSBN 2026 NCLEX-PN Test Plan",
    license: "NCSBN official publication; reference/link only unless permission states otherwise",
    allowedUse: ["framework_reference", "taxonomy_alignment", "client_needs_alignment"],
    prohibitedUse: ["copying_question_wording", "claiming_official_affiliation", "claiming_official_cat_replication"],
    attributionRequired: false,
  },
  {
    sourceId: "open-rn-nursing-fundamentals-2e",
    title: "Open RN Nursing Fundamentals 2e",
    license: "Creative Commons Attribution where indicated; verify page/media exceptions",
    allowedUse: ["concept_reference", "remediation_reference", "plain_language_teaching_reference"],
    prohibitedUse: ["copying_question_wording", "copying_scenario_structure_without_transformation", "using_images_without_license_check"],
    attributionRequired: true,
  },
  {
    sourceId: "open-rn-nursing-pharmacology",
    title: "Open RN Nursing Pharmacology",
    license: "Creative Commons Attribution where indicated; verify page/media exceptions",
    allowedUse: ["concept_reference", "remediation_reference", "medication_safety_reference"],
    prohibitedUse: ["copying_question_wording", "copying_scenario_structure_without_transformation", "using_images_without_license_check"],
    attributionRequired: true,
  },
  {
    sourceId: "medlineplus-health-topics",
    title: "MedlinePlus Health Topics",
    license: "Many federal-government-produced areas are public domain; verify page-specific restrictions and third-party content",
    allowedUse: ["patient_education_reference", "plain_language_concept_reference"],
    prohibitedUse: ["copying_third_party_media", "implying_medlineplus_endorsement"],
    attributionRequired: true,
  },
  {
    sourceId: "cdc-public-health-guidance",
    title: "CDC Public Health Guidance",
    license: "U.S. federal public health reference; verify page-specific third-party media/content restrictions",
    allowedUse: ["infection_control_reference", "public_health_reference", "patient_teaching_reference"],
    prohibitedUse: ["copying_third_party_media", "implying_cdc_endorsement"],
    attributionRequired: true,
  },
];
