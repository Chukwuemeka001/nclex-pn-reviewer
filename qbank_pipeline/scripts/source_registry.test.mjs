import assert from "node:assert/strict";
import {
  REQUIRED_SOURCE_FIELDS,
  summarizeSourceRegistry,
  validateSourceEntry,
  validateSourceRegistry,
} from "./source_registry.mjs";

const safeEntry = {
  sourceId: "open-rn-fundamentals-2e",
  title: "Open RN Nursing Fundamentals 2e",
  url: "https://wtcs.pressbooks.pub/nursingfundamentals/",
  sourceType: "open_educational_resource",
  license: "CC BY 4.0 subject to page/media exceptions",
  allowedUse: ["concept_reference", "remediation_summary", "original_question_inspiration"],
  prohibitedUse: ["copying_page_text_without_attribution", "copying_third_party_media_without_license_check"],
  attributionRequired: true,
  attributionText: "Open RN Nursing Fundamentals 2e, WisTech Open, CC BY 4.0 where indicated.",
  checkedAt: "2026-05-12",
  status: "approved_reference",
  notes: "Use for nursing fundamentals concepts and remediation with attribution.",
};

function testRequiredFieldsAreDocumented() {
  assert.ok(REQUIRED_SOURCE_FIELDS.includes("sourceId"));
  assert.ok(REQUIRED_SOURCE_FIELDS.includes("license"));
  assert.ok(REQUIRED_SOURCE_FIELDS.includes("prohibitedUse"));
}

function testValidateSourceEntryAcceptsSafeEntry() {
  const result = validateSourceEntry(safeEntry);
  assert.deepEqual(result.issues, []);
  assert.equal(result.safeForConceptUse, true);
}

function testValidateSourceEntryRejectsMissingFields() {
  const result = validateSourceEntry({ ...safeEntry, license: "" });
  assert.equal(result.safeForConceptUse, false);
  assert.ok(result.issues.some((issue) => issue.includes("license")));
}

function testValidateSourceEntryRejectsLeakedOrProprietaryApprovedSources() {
  const result = validateSourceEntry({
    ...safeEntry,
    sourceId: "bad-dump",
    title: "Real NCLEX leaked dump",
    status: "approved_reference",
    allowedUse: ["question_generation"],
    prohibitedUse: [],
    notes: "leaked real exam questions from paid qbank",
  });
  assert.equal(result.safeForConceptUse, false);
  assert.ok(result.issues.some((issue) => issue.includes("unsafe source risk")));
}

function testValidateRegistryRejectsDuplicateIds() {
  const result = validateSourceRegistry([safeEntry, { ...safeEntry }]);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes("Duplicate sourceId")));
}

function testSummarizeRegistryCountsByTypeAndStatus() {
  const summary = summarizeSourceRegistry([safeEntry, { ...safeEntry, sourceId: "ncsbn-test-plan", sourceType: "official_framework", status: "framework_reference_only", attributionRequired: false }]);
  assert.equal(summary.total, 2);
  assert.equal(summary.bySourceType.open_educational_resource, 1);
  assert.equal(summary.byStatus.framework_reference_only, 1);
  assert.equal(summary.attributionRequired, 1);
}

function run() {
  testRequiredFieldsAreDocumented();
  testValidateSourceEntryAcceptsSafeEntry();
  testValidateSourceEntryRejectsMissingFields();
  testValidateSourceEntryRejectsLeakedOrProprietaryApprovedSources();
  testValidateRegistryRejectsDuplicateIds();
  testSummarizeRegistryCountsByTypeAndStatus();
  console.log("source_registry tests passed");
}

run();
