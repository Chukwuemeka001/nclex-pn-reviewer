import fs from "node:fs/promises";
import path from "node:path";

const ROOT = "/Users/emeka/Documents/Codex/2026-05-02/hey-codex-browser-plugin-browser-use/qbank_pipeline";
const DIRS = {
  sourceRaw: path.join(ROOT, "source_raw"),
  validationReports: path.join(ROOT, "validation_reports"),
  blueprints: path.join(ROOT, "blueprints"),
  originalDrafts: path.join(ROOT, "original_drafts"),
  similarityAudits: path.join(ROOT, "similarity_audits"),
  clinicalReviewQueue: path.join(ROOT, "clinical_review_queue"),
  approvedQuestions: path.join(ROOT, "approved_questions"),
  rejectedQuestions: path.join(ROOT, "rejected_questions"),
  batchReports: path.join(ROOT, "batch_reports"),
};

const MASTER_SOURCE = {
  masterSourceName: "Alphaslice NCLEX-PN Qbank",
  masterSourceUrl: "https://www.alphaslicenurse.com/products/qbank-nclex-pn/categories/2147982958/posts/2149260641",
};

const EXTRACTION_BATCH_ID = "batch_100";

const Q_BANK_GROUPS = [
  "Assistive Devices test",
  "Assistive Devices BONUS test",
  "Health Promotion and Maintenance test",
  "Health Promotion and Maintenance BONUS test",
  "Integrated Processes Test 1",
  "Integrated Processes Test 2",
  "Integrated Processes Test 3",
  "Integrated Processes Test 4",
  "Integrated Processes Test 5",
  "Integrated Processes (The Nursing Process) test",
  "Management of Care Test 1",
  "Management of Care Test 2",
  "Management of Care Test 3",
  "Management of Care Test 4",
  "Management of Care BONUS Test",
  "Physiological Adaptation Test 1",
  "Physiological Adaptation Test 2",
  "Physiological Adaptation Test 3",
  "Physiological Adaptation Bonus Test",
  "Pharmacological and Parenteral Therapies Test 1",
  "Pharmacological and Parenteral Therapies Test 2",
  "Pharmacological and Parenteral Therapies - Test 3 (NEW)",
  "Reduction Risk Potential Test",
  "Reduction Risk Potential Bonus Test",
  "Psychosocial Integrity Abuse and Neglect Test",
  "Psychosocial Integrity Abuse and Neglect Bonus Test",
  "Integrated Processes (Basic Math + Arithmetic) test",
  "Safety and Infection Control Test 1",
  "Safety and Infection Control Test 2",
];

const stopWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "can", "client", "for", "from", "had", "has",
  "have", "in", "into", "is", "it", "its", "of", "on", "or", "patient", "should", "that", "the",
  "their", "them", "this", "to", "use", "used", "using", "was", "were", "what", "when", "which",
  "who", "with", "you", "your", "nurse", "nursing",
]);

const clinicalTerms = [
  "amputation", "prosthesis", "residual limb", "stump", "phantom", "brace", "orthotic", "parkinson",
  "tremor", "dentures", "hearing", "audiologist", "cane", "crutches", "constipation", "defecation",
  "sphincter", "q-tip", "cotton swab", "ear canal", "eye", "foreign body", "irrigation", "eye cup",
  "low vision", "blind", "dizziness", "vertigo", "diabetes", "osteoporosis", "laxative", "fiber",
  "psyllium", "fluids", "walking", "weighted utensils", "denture", "caption", "phone", "infection",
  "safety", "skin", "pressure", "edema", "swelling", "mobility", "ambulation",
];

const TAG_INDEX = {
  examProgram: [
    { id: "nclex-rn", label: "NCLEX-RN" },
    { id: "nclex-pn", label: "NCLEX-PN" },
  ],
  clientNeedsCategory: [
    { id: "safe-effective-care-environment", label: "Safe and Effective Care Environment" },
    { id: "health-promotion-maintenance", label: "Health Promotion and Maintenance" },
    { id: "psychosocial-integrity", label: "Psychosocial Integrity" },
    { id: "physiological-integrity", label: "Physiological Integrity" },
    { id: "needs-classification-pending-review", label: "Needs Classification Pending Review" },
  ],
  clientNeedsSubcategory: [
    { id: "management-of-care", label: "Management of Care" },
    { id: "safety-infection-control", label: "Safety and Infection Control" },
    { id: "basic-care-comfort", label: "Basic Care and Comfort" },
    { id: "pharmacological-parenteral-therapies", label: "Pharmacological and Parenteral Therapies" },
    { id: "reduction-of-risk-potential", label: "Reduction of Risk Potential" },
    { id: "physiological-adaptation", label: "Physiological Adaptation" },
    { id: "pending-clinical-review", label: "Pending Clinical Review" },
  ],
  clinicalJudgmentStep: [
    { id: "recognize-cues", label: "Recognize Cues" },
    { id: "analyze-cues", label: "Analyze Cues" },
    { id: "prioritize-hypotheses", label: "Prioritize Hypotheses" },
    { id: "generate-solutions", label: "Generate Solutions" },
    { id: "take-action", label: "Take Action" },
    { id: "evaluate-outcomes", label: "Evaluate Outcomes" },
  ],
  integratedProcess: [
    { id: "nursing-process", label: "Nursing Process" },
    { id: "clinical-judgment", label: "Clinical Judgment" },
    { id: "teaching-learning", label: "Teaching/Learning" },
    { id: "communication-documentation", label: "Communication and Documentation" },
    { id: "culture-spirituality", label: "Culture and Spirituality" },
  ],
  nursingProcessStep: [
    { id: "assessment", label: "Assessment" },
    { id: "analysis", label: "Analysis" },
    { id: "planning", label: "Planning" },
    { id: "implementation", label: "Implementation" },
    { id: "evaluation", label: "Evaluation" },
    { id: "pending-clinical-review", label: "Pending Clinical Review" },
  ],
  questionType: [
    { id: "multiple-choice", label: "Multiple Choice" },
    { id: "multiple-response", label: "Multiple Response" },
    { id: "case-study", label: "Case Study" },
    { id: "ordered-response", label: "Ordered Response" },
    { id: "fill-in-the-blank", label: "Fill in the Blank" },
  ],
  population: [
    { id: "adult", label: "Adult" },
    { id: "older-adult", label: "Older Adult" },
    { id: "adolescent", label: "Adolescent" },
    { id: "postoperative-client", label: "Postoperative Client" },
    { id: "sensory-impairment", label: "Sensory Impairment" },
    { id: "mobility-impairment", label: "Mobility Impairment" },
    { id: "pending-review", label: "Pending Review" },
  ],
  bodySystem: [
    { id: "neurological", label: "Neurological" },
    { id: "musculoskeletal", label: "Musculoskeletal" },
    { id: "gastrointestinal", label: "Gastrointestinal" },
    { id: "sensory-visual", label: "Sensory: Visual" },
    { id: "sensory-auditory", label: "Sensory: Auditory" },
    { id: "integumentary", label: "Integumentary" },
    { id: "general-safety", label: "General Safety" },
    { id: "pending-review", label: "Pending Review" },
  ],
  skill: [
    { id: "patient-teaching", label: "Patient Teaching" },
    { id: "assistive-device-use", label: "Assistive Device Use" },
    { id: "skin-assessment", label: "Skin Assessment" },
    { id: "mobility-support", label: "Mobility Support" },
    { id: "comfort-measures", label: "Comfort Measures" },
    { id: "nutrition-teaching", label: "Nutrition Teaching" },
    { id: "elimination-management", label: "Elimination Management" },
    { id: "sensory-care", label: "Sensory Care" },
    { id: "equipment-identification", label: "Equipment Identification" },
    { id: "pending-review", label: "Pending Review" },
  ],
  topic: [
    { id: "low-vision-meal-orientation", label: "Low-Vision Meal Orientation" },
    { id: "vertigo-dizziness", label: "Vertigo and Dizziness" },
    { id: "prosthesis-care", label: "Prosthesis Care" },
    { id: "residual-limb-care", label: "Residual Limb Care" },
    { id: "phantom-limb-pain", label: "Phantom Limb Pain" },
    { id: "brace-care", label: "Brace Care" },
    { id: "adaptive-feeding-equipment", label: "Adaptive Feeding Equipment" },
    { id: "denture-care", label: "Denture Care" },
    { id: "hearing-assistive-technology", label: "Hearing Assistive Technology" },
    { id: "cane-use", label: "Cane Use" },
    { id: "crutch-use", label: "Crutch Use" },
    { id: "constipation-management", label: "Constipation Management" },
    { id: "bowel-elimination-physiology", label: "Bowel Elimination Physiology" },
    { id: "ear-hygiene", label: "Ear Hygiene" },
    { id: "ocular-foreign-body", label: "Ocular Foreign Body" },
    { id: "eye-irrigation-equipment", label: "Eye Irrigation Equipment" },
    { id: "pending-review", label: "Pending Review" },
  ],
  safety: [
    { id: "fall-risk", label: "Fall Risk" },
    { id: "skin-integrity", label: "Skin Integrity" },
    { id: "infection-risk", label: "Infection Risk" },
    { id: "injury-prevention", label: "Injury Prevention" },
    { id: "device-safety", label: "Device Safety" },
    { id: "ocular-safety", label: "Ocular Safety" },
    { id: "pending-review", label: "Pending Review" },
  ],
  difficulty: [
    { id: "easy", label: "Easy" },
    { id: "medium", label: "Medium" },
    { id: "medium-high", label: "Medium-High" },
    { id: "hard", label: "Hard" },
    { id: "pending-review", label: "Pending Review" },
  ],
};

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return String(value || "quiz")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "quiz";
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function words(text) {
  return normalize(text)
    .split(" ")
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function uniqueWords(text) {
  return [...new Set(words(text))];
}

function overlapPercent(sourceText, newText) {
  const source = uniqueWords(sourceText);
  const next = new Set(uniqueWords(newText));
  if (source.length === 0) return 0;
  return Number(((source.filter((word) => next.has(word)).length / source.length) * 100).toFixed(1));
}

function overlapStats(sourceText, newText) {
  const source = uniqueWords(sourceText);
  const next = new Set(uniqueWords(newText));
  const shared = source.filter((word) => next.has(word));
  return {
    percent: source.length === 0 ? 0 : Number(((shared.length / source.length) * 100).toFixed(1)),
    sharedCount: shared.length,
    sharedWords: shared,
    sourceWordCount: source.length,
  };
}

function findTerms(text) {
  const normalized = normalize(text);
  return clinicalTerms.filter((term) => normalized.includes(normalize(term)));
}

function tagById(group, id) {
  const match = TAG_INDEX[group].find((tag) => tag.id === id);
  if (!match) throw new Error(`Unknown tag ${group}.${id}`);
  return match;
}

function tagsByIds(group, ids) {
  return [...new Set(ids)].map((id) => tagById(group, id));
}

function groupTypeFromName(groupName) {
  if (/bonus/i.test(groupName)) return "bonus_test";
  if (/integrated processes/i.test(groupName)) return "integrated_processes_test";
  return "standard_test";
}

function testNumberFromName(groupName) {
  const match = groupName.match(/test\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function inferGroupCategory(groupName) {
  const n = normalize(groupName);
  if (n.includes("health promotion")) return "health-promotion-maintenance";
  if (n.includes("management of care")) return "safe-effective-care-environment";
  if (n.includes("safety and infection")) return "safe-effective-care-environment";
  if (n.includes("physiological adaptation")) return "physiological-integrity";
  if (n.includes("pharmacological")) return "physiological-integrity";
  if (n.includes("reduction risk")) return "physiological-integrity";
  if (n.includes("psychosocial")) return "psychosocial-integrity";
  if (n.includes("assistive devices")) return "needs-classification-pending-review";
  return "needs-classification-pending-review";
}

function inferTopicCluster(groupName) {
  const n = normalize(groupName);
  if (n.includes("assistive devices")) return "assistive-devices";
  if (n.includes("safety and infection")) return "safety-infection-control";
  if (n.includes("health promotion")) return "health-promotion-maintenance";
  if (n.includes("management of care")) return "management-of-care";
  if (n.includes("physiological adaptation")) return "physiological-adaptation";
  if (n.includes("pharmacological")) return "pharmacological-parenteral-therapies";
  if (n.includes("reduction risk")) return "reduction-of-risk-potential";
  if (n.includes("psychosocial")) return "psychosocial-integrity";
  if (n.includes("basic math")) return "basic-math-arithmetic";
  if (n.includes("nursing process")) return "nursing-process";
  if (n.includes("integrated processes")) return "integrated-processes";
  return slugify(groupName);
}

function sourceGroupFor(groupName, overrides = {}) {
  const groupSlug = overrides.groupSlug || slugify(groupName);
  return {
    ...MASTER_SOURCE,
    groupName,
    groupSlug,
    groupType: overrides.groupType || groupTypeFromName(groupName),
    testNumber: overrides.testNumber ?? testNumberFromName(groupName),
    isBonus: overrides.isBonus ?? /bonus/i.test(groupName),
    isNew: overrides.isNew ?? /new/i.test(groupName),
    inferredClientNeedsCategory: overrides.inferredClientNeedsCategory || inferGroupCategory(groupName),
    inferredTopicCluster: overrides.inferredTopicCluster || inferTopicCluster(groupName),
    extractionBatchId: overrides.extractionBatchId || EXTRACTION_BATCH_ID,
  };
}

const GROUP_MANIFEST = Q_BANK_GROUPS.map((groupName) => sourceGroupFor(groupName));

function sourceGroupForSlug(slug) {
  return GROUP_MANIFEST.find((group) => group.groupSlug === slug) ||
    (slug === "assistive_devices_first20" ? sourceGroupFor("Assistive Devices test", { groupSlug: "assistive-devices-test" }) : null) ||
    sourceGroupFor(slug.replace(/-/g, " "), { groupSlug: slug });
}

function inferQuestionTypeTag(questionType) {
  if (questionType === "multiple_response") return tagById("questionType", "multiple-response");
  if (questionType === "case_study") return tagById("questionType", "case-study");
  return tagById("questionType", "multiple-choice");
}

function inferTopicTagIds(text) {
  const n = normalize(text);
  const ids = [];
  if (/low vision|blind|macular|meal|plate/.test(n)) ids.push("low-vision-meal-orientation");
  if (/vertigo|dizziness|lightheaded/.test(n)) ids.push("vertigo-dizziness");
  if (/prosthesis|prosthetic/.test(n)) ids.push("prosthesis-care");
  if (/residual limb|stump|amputation site|below knee|above knee/.test(n)) ids.push("residual-limb-care");
  if (/phantom/.test(n)) ids.push("phantom-limb-pain");
  if (/brace|orthotic|padding/.test(n)) ids.push("brace-care");
  if (/weighted utensil|eating utensil|feeding/.test(n)) ids.push("adaptive-feeding-equipment");
  if (/denture/.test(n)) ids.push("denture-care");
  if (/hearing|audiologist|caption|phone/.test(n)) ids.push("hearing-assistive-technology");
  if (/\bcane\b/.test(n)) ids.push("cane-use");
  if (/crutch/.test(n)) ids.push("crutch-use");
  if (/constipation|stool|laxative|fiber|psyllium/.test(n)) ids.push("constipation-management");
  if (/defecation|sphincter|rectum|anal/.test(n)) ids.push("bowel-elimination-physiology");
  if (/q tip|cotton swab|ear canal/.test(n)) ids.push("ear-hygiene");
  if (/foreign body|corneal|ocular|eye pain/.test(n)) ids.push("ocular-foreign-body");
  if (/eye cup|eye irrigation|irrigation/.test(n)) ids.push("eye-irrigation-equipment");
  return ids.length ? ids : ["pending-review"];
}

function inferBodySystemTagIds(text) {
  const n = normalize(text);
  const ids = [];
  if (/vertigo|dizziness|phantom|parkinson|tremor|nerve|sphincter/.test(n)) ids.push("neurological");
  if (/amputation|prosthesis|brace|orthotic|cane|crutch|mobility|ambulation/.test(n)) ids.push("musculoskeletal");
  if (/constipation|stool|defecation|rectum|anal|bowel|intestine|denture/.test(n)) ids.push("gastrointestinal");
  if (/eye|ocular|vision|blind|macular/.test(n)) ids.push("sensory-visual");
  if (/hearing|ear|audiologist|q tip|cotton swab/.test(n)) ids.push("sensory-auditory");
  if (/skin|pressure|irritation|residual limb|stump|amputation site/.test(n)) ids.push("integumentary");
  return ids.length ? ids : ["pending-review"];
}

function inferSkillTagIds(text) {
  const n = normalize(text);
  const ids = ["patient-teaching"];
  if (/assistive|prosthesis|prosthetic|brace|orthotic|cane|crutch|utensil|denture|phone|eye cup/.test(n)) ids.push("assistive-device-use");
  if (/skin|pressure|irritation|residual limb|stump|amputation site/.test(n)) ids.push("skin-assessment");
  if (/mobility|ambulation|walking|cane|crutch/.test(n)) ids.push("mobility-support");
  if (/pain|comfort|massage|phantom/.test(n)) ids.push("comfort-measures");
  if (/diet|nutrition|fiber|psyllium|fluid|food|meal/.test(n)) ids.push("nutrition-teaching");
  if (/constipation|defecation|bowel|stool/.test(n)) ids.push("elimination-management");
  if (/vision|blind|hearing|ear|eye|ocular/.test(n)) ids.push("sensory-care");
  if (/shown below|picture|item|device|equipment|cup/.test(n)) ids.push("equipment-identification");
  return ids.length ? ids : ["pending-review"];
}

function inferPopulationTagIds(text) {
  const n = normalize(text);
  const ids = [];
  if (/86|68|64|older|elder/.test(n)) ids.push("older-adult");
  if (/15|teen|adolescent/.test(n)) ids.push("adolescent");
  if (/adult|client|patient|woman|man|female|male/.test(n)) ids.push("adult");
  if (/amputation|postoperative|surgery/.test(n)) ids.push("postoperative-client");
  if (/vision|blind|hearing|dizziness|vertigo/.test(n)) ids.push("sensory-impairment");
  if (/prosthesis|brace|cane|crutch|walking|ambulation|mobility/.test(n)) ids.push("mobility-impairment");
  return ids.length ? ids : ["pending-review"];
}

function inferSafetyTagIds(text) {
  const n = normalize(text);
  const ids = [];
  if (/fall|cane|crutch|walking|ambulation|mobility/.test(n)) ids.push("fall-risk");
  if (/skin|pressure|irritation|residual limb|stump|padding|brace/.test(n)) ids.push("skin-integrity");
  if (/infection|foreign body|wound/.test(n)) ids.push("infection-risk");
  if (/injury|q tip|cotton swab|ear canal|prosthesis|crutch|brace/.test(n)) ids.push("injury-prevention");
  if (/device|prosthesis|brace|cane|crutch|denture|utensil|phone|cup/.test(n)) ids.push("device-safety");
  if (/eye|ocular|corneal|irrigation/.test(n)) ids.push("ocular-safety");
  return ids.length ? ids : ["pending-review"];
}

function inferClientNeeds(text) {
  const n = normalize(text);
  if (/fall|infection|injury|q tip|foreign body|crutch|safety/.test(n)) {
    return {
      category: tagById("clientNeedsCategory", "safe-effective-care-environment"),
      subcategory: tagById("clientNeedsSubcategory", "safety-infection-control"),
    };
  }
  if (/skin|pressure|swelling|edema|eye|ocular|prosthesis|brace|residual limb/.test(n)) {
    return {
      category: tagById("clientNeedsCategory", "physiological-integrity"),
      subcategory: tagById("clientNeedsSubcategory", "reduction-of-risk-potential"),
    };
  }
  if (/vertigo|dizziness|phantom|sphincter|defecation|parkinson|tremor/.test(n)) {
    return {
      category: tagById("clientNeedsCategory", "physiological-integrity"),
      subcategory: tagById("clientNeedsSubcategory", "physiological-adaptation"),
    };
  }
  if (/meal|food|denture|hearing|cane|constipation|comfort|pain|utensil|nutrition|bowel/.test(n)) {
    return {
      category: tagById("clientNeedsCategory", "physiological-integrity"),
      subcategory: tagById("clientNeedsSubcategory", "basic-care-comfort"),
    };
  }
  return {
    category: tagById("clientNeedsCategory", "needs-classification-pending-review"),
    subcategory: tagById("clientNeedsSubcategory", "pending-clinical-review"),
  };
}

function inferIntegratedProcess(text) {
  const n = normalize(text);
  if (/teach|instruction|education|recommend|should include|client education/.test(n)) {
    return tagById("integratedProcess", "teaching-learning");
  }
  if (/urgent|priority|safest|first|risk/.test(n)) {
    return tagById("integratedProcess", "clinical-judgment");
  }
  return tagById("integratedProcess", "nursing-process");
}

function inferNursingProcess(text, questionType) {
  const n = normalize(text);
  if (/assess|inspect|identify|recognize|which statement|what is/.test(n)) return tagById("nursingProcessStep", "assessment");
  if (/teach|instruct|intervention|respond|encourage|apply|clean|hold|use/.test(n)) return tagById("nursingProcessStep", "implementation");
  if (questionType === "multiple_response") return tagById("nursingProcessStep", "planning");
  return tagById("nursingProcessStep", "pending-clinical-review");
}

function inferClinicalJudgment(text, questionType) {
  const n = normalize(text);
  if (/what is|which statement|identify|recognize/.test(n)) return tagById("clinicalJudgmentStep", "recognize-cues");
  if (/select all|appropriate|which actions/.test(n) || questionType === "multiple_response") return tagById("clinicalJudgmentStep", "analyze-cues");
  if (/priority|first|urgent|safest/.test(n)) return tagById("clinicalJudgmentStep", "prioritize-hypotheses");
  if (/intervention|respond|teach|instruct|should/.test(n)) return tagById("clinicalJudgmentStep", "take-action");
  return tagById("clinicalJudgmentStep", "take-action");
}

function inferDifficulty(questionType, text) {
  const n = normalize(text);
  if (questionType === "multiple_response" || /priority|urgent|clinical judgment|select all/.test(n)) return tagById("difficulty", "medium-high");
  if (/what is the item|correct procedure|best way/.test(n)) return tagById("difficulty", "easy");
  return tagById("difficulty", "medium");
}

function eligibilityFor(questionType, difficultyTag) {
  return {
    tutor_mode: true,
    timed_practice: true,
    adaptive_exam: difficultyTag.id !== "pending-review",
    case_study_mode: questionType === "case_study" || difficultyTag.id === "medium-high",
    daily_plan: true,
    weak_area_drill: true,
  };
}

function buildTagging({ text, questionType, explicitDifficulty }) {
  const clientNeeds = inferClientNeeds(text);
  const difficulty = explicitDifficulty
    ? tagById("difficulty", slugify(explicitDifficulty))
    : inferDifficulty(questionType, text);
  const topicTags = tagsByIds("topic", inferTopicTagIds(text));
  const skillTags = tagsByIds("skill", inferSkillTagIds(text));
  const bodySystemTags = tagsByIds("bodySystem", inferBodySystemTagIds(text));
  const tagging = {
    examProgram: tagById("examProgram", "nclex-pn"),
    clientNeedsCategory: clientNeeds.category,
    clientNeedsSubcategory: clientNeeds.subcategory,
    integratedProcess: inferIntegratedProcess(text),
    clinicalJudgmentStep: inferClinicalJudgment(text, questionType),
    nursingProcessStep: inferNursingProcess(text, questionType),
    questionType: inferQuestionTypeTag(questionType),
    topicTags,
    populationTags: tagsByIds("population", inferPopulationTagIds(text)),
    safetyTags: tagsByIds("safety", inferSafetyTagIds(text)),
    skillTags,
    bodySystemTags,
    difficulty,
    estimatedTimeSeconds: questionType === "multiple_response" ? 90 : difficulty.id === "medium-high" ? 75 : 60,
    examModeEligibility: eligibilityFor(questionType, difficulty),
  };
  const combinedTagCount = topicTags.length + skillTags.length + bodySystemTags.length;
  const needsReview = [
    clientNeeds.category.id,
    clientNeeds.subcategory.id,
    difficulty.id,
    ...topicTags.map((tag) => tag.id),
    ...tagging.populationTags.map((tag) => tag.id),
    ...tagging.safetyTags.map((tag) => tag.id),
    ...skillTags.map((tag) => tag.id),
    ...bodySystemTags.map((tag) => tag.id),
  ].some((id) => id.includes("pending")) || combinedTagCount < 2;

  return { tagging, needsTagReview: needsReview };
}

async function ensureDirs() {
  await Promise.all([
    ...Object.values(DIRS).map((dir) => fs.mkdir(dir, { recursive: true })),
    ...["sourceRaw", "validationReports", "blueprints", "originalDrafts", "similarityAudits", "clinicalReviewQueue"]
      .map((key) => fs.mkdir(path.join(DIRS[key], "groups"), { recursive: true })),
  ]);
  await writeJson(path.join(ROOT, "tag_index.json"), TAG_INDEX);
  await writeJson(path.join(ROOT, "manifests", "qbank_groups.json"), {
    ...MASTER_SOURCE,
    extractionBatchId: EXTRACTION_BATCH_ID,
    groups: GROUP_MANIFEST,
  });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function listRawJsonFiles() {
  const groupsDir = path.join(DIRS.sourceRaw, "groups");
  const groupEntries = await fs.readdir(groupsDir, { withFileTypes: true }).catch(() => []);
  const groupFiles = groupEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith("_raw.json"))
    .map((entry) => path.join(groupsDir, entry.name))
    .sort();
  if (groupFiles.length) return groupFiles;
  const entries = await fs.readdir(DIRS.sourceRaw, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith("_raw.json") && entry.name !== `${EXTRACTION_BATCH_ID}_raw.json`)
    .map((entry) => path.join(DIRS.sourceRaw, entry.name))
    .sort();
}

function isGroupRawPath(rawPath) {
  return path.dirname(rawPath).endsWith(`${path.sep}groups`);
}

function groupSlugFromRawPath(rawPath) {
  const slug = path.basename(rawPath).replace(/_raw\.json$/, "");
  return slug === "assistive_devices_first20" ? "assistive-devices-test" : slug;
}

function withSourceGroup(record, sourceGroup) {
  return {
    ...record,
    sourceGroup: {
      ...(record.sourceGroup || {}),
      ...sourceGroup,
      extractionBatchId: sourceGroup.extractionBatchId,
    },
  };
}

async function seedKnownGroupRawFiles() {
  const legacyAssistivePath = path.join(DIRS.sourceRaw, "assistive_devices_first20_raw.json");
  const assistiveGroup = sourceGroupFor("Assistive Devices test", { groupSlug: "assistive-devices-test" });
  const targetPath = path.join(DIRS.sourceRaw, "groups", `${assistiveGroup.groupSlug}_raw.json`);
  try {
    await fs.access(targetPath);
  } catch {
    try {
      const records = await readJson(legacyAssistivePath);
      await writeJson(targetPath, records.map((record) => withSourceGroup(record, assistiveGroup)));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

function outputPathFor(rawPath, dir, slug, suffix) {
  return path.join(dir, isGroupRawPath(rawPath) ? "groups" : "", `${slug}_${suffix}.json`);
}

function groupCategoryConflicts(sourceGroup, tagging) {
  if (!sourceGroup?.inferredClientNeedsCategory || !tagging?.clientNeedsCategory?.id) return false;
  if (sourceGroup.inferredClientNeedsCategory === "needs-classification-pending-review") return false;
  return sourceGroup.inferredClientNeedsCategory !== tagging.clientNeedsCategory.id;
}

function mapCorrectAnswer(correctAnswer, answerChoices) {
  const choices = Array.isArray(answerChoices) ? answerChoices : [];
  const raw = String(correctAnswer || "").trim();
  if (!raw) return { correctAnswerIndexes: [], correctAnswerText: [] };
  const letters = raw.toUpperCase().split(/[^A-Z]+/).filter((value) => /^[A-Z]$/.test(value));
  const indexes = [...new Set(letters.map((letter) => letter.charCodeAt(0) - 65))]
    .filter((index) => index >= 0 && index < choices.length);
  return { correctAnswerIndexes: indexes, correctAnswerText: indexes.map((index) => choices[index]) };
}

function validateQuiz(records, slug) {
  const issues = [];
  const warnings = [];
  const seen = new Map();

  records.forEach((record, index) => {
    const q = record.questionNumber;
    const stem = String(record.questionStem || "").trim();
    const choices = Array.isArray(record.answerChoices) ? record.answerChoices : [];
    const expectedNumber = index + 1;

    if (!stem) issues.push({ code: "empty_stem", questionNumber: q });
    if (choices.length < 2) issues.push({ code: "too_few_choices", questionNumber: q });
    if (q !== expectedNumber) issues.push({ code: "question_number_gap", questionNumber: q, expected: expectedNumber });

    const mapped = mapCorrectAnswer(record.correctAnswer, choices);
    const currentIndexes = record.correctAnswerIndexes || [];
    const currentText = record.correctAnswerText || [];
    if (record.correctAnswer && JSON.stringify(currentIndexes) !== JSON.stringify(mapped.correctAnswerIndexes)) {
      issues.push({ code: "correct_answer_index_mismatch", questionNumber: q });
    }
    if (record.correctAnswer && JSON.stringify(currentText) !== JSON.stringify(mapped.correctAnswerText)) {
      issues.push({ code: "correct_answer_text_mismatch", questionNumber: q });
    }
    if (!record.correctAnswerIndexes?.length) {
      warnings.push({ code: "missing_or_inferred_answer_key", questionNumber: q });
    }
    if (!record.feedbackRationale) warnings.push({ code: "missing_rationale", questionNumber: q });
    if (!Array.isArray(record.warnings)) issues.push({ code: "warnings_not_preserved", questionNumber: q });
    if (Number(record.extractionConfidence) < 0.85) warnings.push({ code: "low_confidence", questionNumber: q });

    choices.forEach((choice, choiceIndex) => {
      if (/Correct Response:|Rat(?:io|o)?nale:|Incorrectly selected|Correctly unselected/i.test(choice)) {
        issues.push({ code: "choice_contains_stale_feedback", questionNumber: q, choiceIndex });
      }
    });

    const normalizedStem = record.normalizedStem || normalize(stem);
    if (seen.has(normalizedStem)) {
      const duplicateFlagged = (record.warnings || []).some((warning) => /duplicate/i.test(warning));
      if (!duplicateFlagged) issues.push({ code: "duplicate_not_flagged", questionNumber: q, firstQuestionNumber: seen.get(normalizedStem) });
    } else {
      seen.set(normalizedStem, q);
    }
  });

  return {
    slug,
    generatedAt: new Date().toISOString(),
    status: issues.length ? "review_required" : "pass",
    recordCount: records.length,
    issues,
    warnings,
  };
}

function validateTaggingObject(item) {
  const issues = [];
  const tagging = item.tagging;
  if (!tagging) return ["missing_tagging"];
  const requiredSingle = [
    "examProgram",
    "clientNeedsCategory",
    "clientNeedsSubcategory",
    "integratedProcess",
    "clinicalJudgmentStep",
    "nursingProcessStep",
    "questionType",
    "difficulty",
  ];
  for (const key of requiredSingle) {
    if (!tagging[key]?.id || !tagging[key]?.label) issues.push(`missing_${key}`);
  }
  const requiredArrays = ["topicTags", "populationTags", "safetyTags", "skillTags", "bodySystemTags"];
  for (const key of requiredArrays) {
    if (!Array.isArray(tagging[key])) issues.push(`missing_${key}`);
    else if (tagging[key].some((tag) => !tag.id || !tag.label)) issues.push(`invalid_${key}`);
  }
  const combined = [
    ...(tagging.topicTags || []),
    ...(tagging.skillTags || []),
    ...(tagging.bodySystemTags || []),
  ];
  if (combined.length < 2) issues.push("insufficient_topic_skill_body_system_tags");
  for (const key of ["topicTags", "populationTags", "safetyTags", "skillTags", "bodySystemTags"]) {
    for (const tag of tagging[key] || []) {
      if (tag.id !== slugify(tag.id)) issues.push(`non_normalized_${key}_${tag.id}`);
    }
  }
  const eligibility = tagging.examModeEligibility || {};
  for (const key of ["tutor_mode", "timed_practice", "adaptive_exam", "case_study_mode", "daily_plan", "weak_area_drill"]) {
    if (typeof eligibility[key] !== "boolean") issues.push(`missing_examModeEligibility_${key}`);
  }
  if (typeof tagging.estimatedTimeSeconds !== "number" || tagging.estimatedTimeSeconds <= 0) {
    issues.push("invalid_estimatedTimeSeconds");
  }
  return issues;
}

function inferBlueprint(record, slug) {
  const sourceText = `${record.questionStem || ""} ${(record.answerChoices || []).join(" ")} ${record.feedbackRationale || ""}`;
  const sourceGroup = record.sourceGroup || sourceGroupForSlug(slug);
  const terms = findTerms(sourceText);
  const correctText = (record.correctAnswerText || []).join("; ") || "Correct answer unavailable from extraction";
  const rationaleSummary = String(record.feedbackRationale || "No source rationale captured.")
    .replace(/\s+/g, " ")
    .slice(0, 500);
  const multiple = record.questionType === "multiple_response";
  const imageBased = /shown below|picture|image/i.test(record.questionStem || "");
  const tagResult = buildTagging({
    text: sourceText,
    questionType: record.questionType,
    explicitDifficulty: multiple ? "medium-high" : "medium",
  });

  return {
    sourceQuestionId: `${slug}_q${String(record.questionNumber).padStart(3, "0")}`,
    sourceQuizTitle: record.quizTitle,
    sourceSlug: slug,
    sourceGroup,
    questionNumber: record.questionNumber,
    reviewStatus: tagResult.needsTagReview || groupCategoryConflicts(sourceGroup, tagResult.tagging) ? "needs_tag_review" : "needs_clinical_review",
    testedConcept: `Apply nursing knowledge related to ${terms.slice(0, 4).join(", ") || "the extracted clinical scenario"}.`,
    clientNeedsCategory: tagResult.tagging.clientNeedsCategory.label,
    clientNeedsSubcategory: tagResult.tagging.clientNeedsSubcategory.label,
    clinicalJudgmentStep: tagResult.tagging.clinicalJudgmentStep.label,
    nursingProcessStep: tagResult.tagging.nursingProcessStep.label,
    difficultyEstimate: multiple ? "medium-high" : "medium",
    clinicalScenarioType: terms.slice(0, 5).join(" | ") || "general nursing care scenario",
    correctPrinciple: correctText,
    distractorPatterns: (record.answerChoices || [])
      .filter((choice) => !(record.correctAnswerText || []).includes(choice))
      .slice(0, 5)
      .map((choice) => `Distractor based on: ${choice}`),
    requiredKnowledge: terms.length ? terms : ["source concept requires clinical review"],
    safetyPriority: /safety|fall|infection|eye|skin|pressure|pain|swelling|foreign body/i.test(sourceText) ? "high" : "moderate",
    originalRationaleSummary: rationaleSummary,
    sourceWarnings: [
      ...(record.warnings || []),
      ...(!record.correctAnswerIndexes?.length ? ["Missing or inferred answer key; clinical review required."] : []),
      ...(imageBased ? ["Source appears image-based; avoid text-only approval without media review."] : []),
    ],
    extractionConfidence: record.extractionConfidence,
    tagging: tagResult.tagging,
  };
}

const GENERATION_STRATEGIES = [
  { id: "client-understanding", label: "Client statement shows understanding", angle: "teaching evaluation" },
  { id: "needs-more-teaching", label: "Client statement needs more teaching", angle: "teaching evaluation" },
  { id: "nurse-priority", label: "Nurse action priority", angle: "priority action" },
  { id: "follow-up-finding", label: "Finding requires follow-up", angle: "unexpected finding" },
  { id: "ap-intervention", label: "Assistive personnel action requires intervention", angle: "delegation and supervision" },
  { id: "expected-unexpected", label: "Expected versus unexpected finding", angle: "assessment interpretation" },
  { id: "safest-instruction", label: "Safest instruction", angle: "home safety teaching" },
  { id: "risk-prevention", label: "Risk prevention", angle: "preventive care" },
  { id: "complication-recognition", label: "Complication recognition", angle: "risk escalation" },
  { id: "therapeutic-response", label: "Therapeutic response", angle: "communication" },
  { id: "home-care-teaching", label: "Home care teaching", angle: "discharge teaching" },
  { id: "clinical-judgment", label: "Clinical judgment scenario", angle: "recognize and act" },
];

const CONCEPT_PROFILES = [
  {
    match: /low vision|blind|meal|plate/,
    concept: "low-vision meal orientation",
    setting: "rehabilitation dining room",
    client: "older adult with severe vision loss",
    correctAction: "Orient the meal tray by describing each item according to its hour position.",
    unsafeActions: [
      "Tell the client to feel across the plate to identify foods.",
      "Move items around during the meal without explaining the change.",
      "Ask family to feed the client because vision is limited.",
      "Place all foods in one bowl so the plate is easier to manage.",
    ],
    rationale: "Hour-position meal orientation promotes independence and reduces spills because the client can locate each food item predictably.",
    findings: ["food untouched on one side of the plate", "frequent spills after tray setup"],
    teachingGood: "I will picture the plate like a clock when you tell me where the food is.",
    teachingBad: "I should wait for someone to feed me if I cannot see every item.",
  },
  {
    match: /vertigo|dizziness/,
    concept: "vertigo safety",
    setting: "urgent care discharge area",
    client: "adult reporting spinning dizziness",
    correctAction: "Have the client sit or lie down and call for help before walking.",
    unsafeActions: [
      "Encourage brisk walking to shorten the dizzy spell.",
      "Leave the client standing while looking for discharge papers.",
      "Offer fluids and then allow unassisted ambulation.",
      "Dim the lights and ask the client to walk slowly to the lobby.",
    ],
    rationale: "Vertigo increases fall risk; limiting ambulation and getting assistance are the safest immediate measures.",
    findings: ["reaches for the wall when standing", "reports the room is spinning"],
    teachingGood: "I will sit down and call for help if the spinning feeling starts.",
    teachingBad: "I should keep walking until the dizziness passes.",
  },
  {
    match: /prosthesis|prosthetic|residual limb|stump|amputation/,
    concept: "prosthesis and residual-limb care",
    setting: "outpatient rehabilitation clinic",
    client: "client learning to use a lower-limb prosthesis",
    correctAction: "Inspect the residual limb after removing the prosthesis and report persistent redness or skin breakdown.",
    unsafeActions: [
      "Wear the prosthesis longer when soreness develops to toughen the skin.",
      "Massage an open area before reapplying the prosthesis.",
      "Skip sock changes when the socket feels loose.",
      "Apply a heating pad to the residual limb before each fitting.",
    ],
    rationale: "Skin inspection detects pressure injury early; persistent redness or breakdown can worsen if the prosthesis is reapplied without follow-up.",
    findings: ["redness that remains after the prosthesis is removed", "new drainage from a rubbed area"],
    teachingGood: "I will check my skin every time I remove the prosthesis.",
    teachingBad: "I should keep wearing it if a red area is painful but not bleeding.",
  },
  {
    match: /phantom/,
    concept: "phantom limb pain support",
    setting: "postoperative surgical unit",
    client: "client after limb amputation",
    correctAction: "Acknowledge the pain as real and use prescribed pain-relief and comfort measures.",
    unsafeActions: [
      "Explain that pain cannot occur because the limb is absent.",
      "Tell the client to ignore the sensation until therapy starts.",
      "Restrict all analgesics because the pain is not from tissue injury.",
      "Apply firm pressure to the incision without assessing it.",
    ],
    rationale: "Phantom limb pain is a real neurologic pain experience; validating the report and treating pain support recovery.",
    findings: ["burning sensation where the limb used to be", "distress when pain is dismissed"],
    teachingGood: "I can report pain even when it feels like it is coming from the missing limb.",
    teachingBad: "This pain means the surgery failed.",
  },
  {
    match: /brace|orthotic/,
    concept: "brace skin-integrity care",
    setting: "school health office",
    client: "adolescent wearing a prescribed leg brace",
    correctAction: "Remove the brace as directed and inspect pressure areas for redness or irritation.",
    unsafeActions: [
      "Tighten straps until the limb feels numb.",
      "Place thick padding over every red area without reporting it.",
      "Apply lotion heavily under the brace before sports practice.",
      "Continue the same wear schedule when skin is blistered.",
    ],
    rationale: "A brace can cause pressure or friction injury, so routine skin checks and follow-up for abnormal findings protect skin integrity.",
    findings: ["numb toes after strap tightening", "blistered skin under the brace edge"],
    teachingGood: "I will report red spots that do not fade after the brace is removed.",
    teachingBad: "Numbness means the brace is secure enough.",
  },
  {
    match: /parkinson|tremor|weighted utensil|utensil|feeding/,
    concept: "adaptive feeding equipment",
    setting: "long-term care dining area",
    client: "client with hand tremors during meals",
    correctAction: "Offer weighted utensils and allow extra time for self-feeding.",
    unsafeActions: [
      "Feed the client to finish the meal faster.",
      "Remove adaptive equipment because tremors are intermittent.",
      "Serve only finger foods without assessing preferences.",
      "Ask the client to skip meals when tremors are worse.",
    ],
    rationale: "Adaptive utensils can improve control and preserve independence during meals.",
    findings: ["spills food despite trying to feed self", "avoids meals because of embarrassment"],
    teachingGood: "The weighted spoon may help me control the movement better.",
    teachingBad: "I should stop trying to feed myself when my hands shake.",
  },
  {
    match: /denture/,
    concept: "denture care",
    setting: "medical-surgical unit evening care",
    client: "older adult with removable oral appliances",
    correctAction: "Clean the oral appliance over a towel-lined sink and keep it moist in a labeled container.",
    unsafeActions: [
      "Place dentures on the meal tray after cleaning.",
      "Use hot water to reshape the dentures.",
      "Wrap dentures in tissue and leave them at the bedside.",
      "Scrub the gums forcefully with a stiff brush.",
    ],
    rationale: "Careful handling prevents breakage or loss, and moist storage helps removable oral appliances keep their shape.",
    findings: ["dentures wrapped in a napkin", "dry dentures left on the bedside table"],
    teachingGood: "I will keep them moist in the labeled cup when they are out of my mouth.",
    teachingBad: "It is safe to wrap them in a tissue after cleaning.",
  },
  {
    match: /hearing|audiologist|caption|phone/,
    concept: "hearing-assistive technology",
    setting: "home health visit",
    client: "older adult with reduced hearing",
    correctAction: "Use a captioned or amplified telephone and verify that the client can understand the message.",
    unsafeActions: [
      "Speak from another room to test the device.",
      "Assume written instructions are unnecessary once a phone is provided.",
      "Increase background noise so the client can practice listening.",
      "Ask the client to avoid phone calls for safety.",
    ],
    rationale: "Assistive hearing technology supports communication, but the nurse still verifies understanding and reduces competing noise.",
    findings: ["misses medication instructions over the phone", "turns the television up during calls"],
    teachingGood: "I should reduce background noise before using the captioned phone.",
    teachingBad: "The phone means I no longer need written instructions.",
  },
  {
    match: /\bcane\b/,
    concept: "cane safety",
    setting: "clinic hallway mobility teaching",
    client: "adult beginning to ambulate with a cane",
    correctAction: "Hold the cane on the stronger side and move it with the weaker leg.",
    unsafeActions: [
      "Hold the cane on the weak side to support that leg directly.",
      "Advance the cane after both feet have moved.",
      "Use the cane only on stairs and furniture indoors.",
      "Set the cane height so the elbow remains fully straight.",
    ],
    rationale: "Using the cane on the stronger side widens support and helps unload the weaker leg during gait.",
    findings: ["leans heavily toward the weak side", "places the cane far ahead before stepping"],
    teachingGood: "I will keep the cane on my stronger side.",
    teachingBad: "The cane should go on the same side as my weak leg.",
  },
  {
    match: /crutch/,
    concept: "crutch safety",
    setting: "orthopedic discharge teaching",
    client: "client prescribed axillary crutches",
    correctAction: "Support body weight through the hands and keep the crutch pads below the axillae.",
    unsafeActions: [
      "Rest body weight on the underarm pads.",
      "Adjust crutches so the shoulders are raised.",
      "Skip handgrips if the client has strong upper arms.",
      "Place both crutches far to the side before stepping.",
    ],
    rationale: "Pressure in the axilla can injure nerves; weight should be borne through the hands with proper crutch fit.",
    findings: ["tingling in the hands after crutch walking", "red marks in both axillae"],
    teachingGood: "My hands should carry my weight, not my armpits.",
    teachingBad: "The pads should press firmly into my underarms.",
  },
  {
    match: /constipation|psyllium|fiber|laxative/,
    concept: "constipation prevention",
    setting: "community clinic teaching visit",
    client: "adult with intermittent constipation",
    correctAction: "Increase fluid intake, fiber, and regular activity as tolerated.",
    unsafeActions: [
      "Use stimulant laxatives daily without follow-up.",
      "Reduce fluids when adding a bulk-forming fiber product.",
      "Avoid walking until bowel patterns normalize.",
      "Skip meals to decrease stool volume.",
    ],
    rationale: "Fluids, fiber, and mobility support bowel motility; bulk-forming fiber requires adequate fluid to prevent worsening constipation.",
    findings: ["dry hard stools after starting fiber", "reports low fluid intake"],
    teachingGood: "I need to drink enough fluid when I take a fiber supplement.",
    teachingBad: "Fiber works best when I limit fluids.",
  },
  {
    match: /defecation|sphincter|rectum|bowel/,
    concept: "bowel elimination physiology",
    setting: "skills lab discussion",
    client: "client asking about bowel control",
    correctAction: "Explain that voluntary control occurs through the external anal sphincter.",
    unsafeActions: [
      "Teach that the stomach controls voluntary stool release.",
      "Tell the client bowel control is entirely involuntary.",
      "Identify the internal sphincter as the voluntary muscle.",
      "Explain that urinary muscles control defecation.",
    ],
    rationale: "The external anal sphincter is skeletal muscle and allows voluntary control of defecation.",
    findings: ["confuses urinary and bowel control", "asks why timing of bowel movements can be delayed"],
    teachingGood: "The external sphincter helps me delay a bowel movement briefly.",
    teachingBad: "The internal sphincter is the part I consciously tighten.",
  },
  {
    match: /q tip|cotton swab|ear canal|ear hygiene/,
    concept: "ear canal injury prevention",
    setting: "pediatric urgent care triage",
    client: "adolescent with ear pain after using a cotton swab",
    correctAction: "Stop inserting objects into the ear canal and arrange provider evaluation for pain or drainage.",
    unsafeActions: [
      "Insert another swab to remove any remaining wax.",
      "Irrigate the ear forcefully before assessment.",
      "Place sharp tweezers in the canal to remove debris.",
      "Ignore drainage if hearing seems normal.",
    ],
    rationale: "Objects inserted into the ear canal can injure tissue or the tympanic membrane; pain or drainage needs evaluation.",
    findings: ["bloody drainage from the ear", "sudden decrease in hearing"],
    teachingGood: "I should not put cotton swabs into my ear canal.",
    teachingBad: "A second swab can fix the problem if the first one hurt.",
  },
  {
    match: /foreign body|ocular|eye pain|corneal/,
    concept: "ocular foreign-body safety",
    setting: "worksite first-aid station",
    client: "adult with eye irritation after outdoor debris exposure",
    correctAction: "Prevent rubbing, shield the affected side if needed, and obtain prompt evaluation.",
    unsafeActions: [
      "Rub the eye to move the particle toward the corner.",
      "Apply pressure directly over the painful eye.",
      "Use a dry tissue to sweep across the cornea.",
      "Delay care if tearing decreases.",
    ],
    rationale: "Rubbing or pressure can worsen corneal injury; possible foreign-body exposure needs prompt assessment.",
    findings: ["reports severe eye pain after debris exposure", "keeps rubbing the affected eye"],
    teachingGood: "I should avoid rubbing the affected area and get it checked.",
    teachingBad: "Rubbing helps remove the object safely.",
  },
  {
    match: /eye cup|eye irrigation|irrigation/,
    concept: "eye irrigation equipment use",
    setting: "clinic procedure room",
    client: "client needing gentle eye irrigation",
    correctAction: "Use prescribed eye irrigation equipment to rinse from the inner canthus toward the outer canthus.",
    unsafeActions: [
      "Direct fluid from the outer eye toward the nose.",
      "Use high pressure to finish irrigation quickly.",
      "Reuse contaminated irrigation fluid for the second eye.",
      "Ask the client to keep contact lenses in place during irrigation.",
    ],
    rationale: "Gentle irrigation away from the unaffected eye and nose reduces contamination and protects ocular tissue.",
    findings: ["chemical splash reported before irrigation", "fluid draining toward the other eye"],
    teachingGood: "The rinse should flow away from my other eye.",
    teachingBad: "Higher pressure cleans the eye more safely.",
  },
];

function conceptProfile(blueprint) {
  const text = normalize(`${blueprint.testedConcept} ${blueprint.requiredKnowledge.join(" ")} ${blueprint.correctPrinciple} ${JSON.stringify(blueprint.tagging || {})}`);
  return CONCEPT_PROFILES.find((profile) => profile.match.test(text)) || {
    concept: blueprint.requiredKnowledge.slice(0, 2).join(" and ") || "assistive-device safety",
    setting: "community health teaching visit",
    client: "adult client",
    correctAction: "Use the device as taught, stop if pain or safety concerns occur, and contact the nurse or provider for follow-up.",
    unsafeActions: [
      "Continue the device even when new pain or skin injury appears.",
      "Change the device fit without instruction.",
      "Ignore new symptoms if the device still works.",
      "Ask an untrained family member to adjust the device.",
    ],
    rationale: "Assistive devices are safest when used as instructed and when new pain, skin changes, or function changes are reported early.",
    findings: ["new discomfort during device use", "uncertainty about safe home use"],
    teachingGood: "I will call for guidance if the device causes new pain or skin changes.",
    teachingBad: "I can adjust the device myself if it feels uncomfortable.",
  };
}

function distractorsFor(profile, strategy, attempt) {
  const rotate = attempt % profile.unsafeActions.length;
  const choices = [...profile.unsafeActions.slice(rotate), ...profile.unsafeActions.slice(0, rotate)];
  if (strategy.id === "ap-intervention") {
    return [
      `Tell the AP to continue and document the client's response later.`,
      `Ask the AP to adjust the device without reassessing the client.`,
      choices[0],
    ];
  }
  if (strategy.id === "therapeutic-response") {
    return [
      "That is not something you should be worried about.",
      "You need to be more independent with this equipment.",
      choices[0],
    ];
  }
  return choices.slice(0, 3);
}

function stemForStrategy(profile, strategy) {
  const stems = {
    "client-understanding": `During discharge teaching in the ${profile.setting}, which client statement indicates correct understanding of ${profile.concept}?`,
    "needs-more-teaching": `The nurse is reviewing instructions with a ${profile.client}. Which statement indicates that teaching about ${profile.concept} should be reinforced?`,
    "nurse-priority": `A practical nurse is caring for ${profile.client} in the ${profile.setting}. Which action has the highest priority?`,
    "follow-up-finding": `Which finding for ${profile.client} using assistive support requires follow-up by the nurse?`,
    "ap-intervention": `An assistive personnel is helping ${profile.client} with care in the ${profile.setting}. Which action requires the nurse to intervene?`,
    "expected-unexpected": `The nurse is evaluating ${profile.client}. Which observation is unexpected and should be reported?`,
    "safest-instruction": `Which instruction should the nurse give to promote safe home use related to ${profile.concept}?`,
    "risk-prevention": `A nurse is planning care for ${profile.client}. Which intervention best reduces risk related to ${profile.concept}?`,
    "complication-recognition": `${profile.client} contacts the clinic after teaching. Which report suggests a possible complication?`,
    "therapeutic-response": `${profile.client} says, "I am worried I will not manage this safely at home." Which response by the nurse is therapeutic?`,
    "home-care-teaching": `Which home-care instruction should the nurse include for ${profile.client} learning about ${profile.concept}?`,
    "clinical-judgment": `${profile.client} has ${profile.findings[0]}. Which response by the practical nurse is safest?`,
  };
  return stems[strategy.id];
}

function choicesForStrategy(profile, strategy, attempt) {
  const distractors = distractorsFor(profile, strategy, attempt);
  if (strategy.id === "client-understanding") {
    return {
      choices: [profile.teachingGood, profile.teachingBad, distractors[0], distractors[1]],
      correctIndexes: [0],
      rationale: `This statement reflects safe understanding of ${profile.concept} because it supports the intended device or care technique without increasing risk.`,
    };
  }
  if (strategy.id === "needs-more-teaching") {
    return {
      choices: [profile.teachingBad, profile.teachingGood, distractors[0], distractors[1]],
      correctIndexes: [0],
      rationale: `The selected statement shows misunderstanding and needs follow-up teaching because it could increase injury, delayed care, or loss of independence.`,
    };
  }
  if (strategy.id === "follow-up-finding" || strategy.id === "expected-unexpected" || strategy.id === "complication-recognition") {
    return {
      choices: [profile.findings[0], `asks a clarifying question about ${profile.concept}`, "uses the device slowly after teaching", "requests written instructions for home"],
      correctIndexes: [0],
      rationale: `The finding may signal a safety problem or complication and should be reported or assessed before routine care continues.`,
    };
  }
  if (strategy.id === "ap-intervention") {
    return {
      choices: [distractors[1], profile.correctAction, "reports a change in the client's condition to the nurse", "keeps the call light within reach"],
      correctIndexes: [0],
      rationale: `The nurse intervenes when delegated care could create harm or bypass assessment. Safe delegated care preserves the care plan and reports concerns promptly.`,
    };
  }
  if (strategy.id === "therapeutic-response") {
    return {
      choices: [`Let's review the steps together and identify when you should call for help.`, ...distractors],
      correctIndexes: [0],
      rationale: `The response acknowledges the concern, supports learning, and focuses on safe follow-up rather than dismissing the client's worry.`,
    };
  }
  return {
    choices: [profile.correctAction, ...distractors],
    correctIndexes: [0],
    rationale: `${profile.rationale} The other options delay assessment, increase risk, or reduce safe independent use.`,
  };
}

function shouldUseSata(blueprint, source, strategy) {
  if (!source.correctAnswerIndexes?.length) return false;
  const text = normalize(`${blueprint.testedConcept} ${blueprint.requiredKnowledge.join(" ")}`);
  return strategy.id === "clinical-judgment" && /constipation|prosthesis|crutch|skin|brace|eye/.test(text);
}

function buildStrategyVariant(blueprint, source, variant, strategy, attempt = 0) {
  const profile = conceptProfile(blueprint);
  const sata = shouldUseSata(blueprint, source, strategy);
  const format = sata ? "multiple_response" : "multiple_choice";
  const base = choicesForStrategy(profile, strategy, attempt);
  const choices = sata
    ? [
        profile.correctAction,
        `Stop and report ${profile.findings[0]}.`,
        ...distractorsFor(profile, strategy, attempt).slice(0, 3),
      ]
    : base.choices;
  const correctIndexes = sata ? [0, 1] : base.correctIndexes;
  const stem = sata
    ? `The nurse is preparing teaching for a ${profile.client}. Which actions support safe care related to ${profile.concept}? Select all that apply.`
    : stemForStrategy(profile, strategy);
  const rationale = sata
    ? `${profile.rationale} Reporting abnormal findings adds a safety check before the client continues routine device use.`
    : base.rationale;
  const whyWrong = choices.map((choice, index) => {
    if (correctIndexes.includes(index)) return "";
    return `This option is unsafe or incomplete because it does not support assessment, teaching, or risk reduction for ${profile.concept}.`;
  });
  const draftText = `${stem} ${choices.join(" ")} ${rationale} ${profile.concept}`;
  const tagResult = buildTagging({
    text: draftText,
    questionType: format,
    explicitDifficulty: strategy.id === "clinical-judgment" || strategy.id === "ap-intervention" ? "medium-high" : blueprint.difficultyEstimate,
  });
  const draft = {
    newQuestionId: `${blueprint.sourceQuestionId}_variant_${variant.toLowerCase()}`,
    sourceQuestionId: blueprint.sourceQuestionId,
    sourceGroup: blueprint.sourceGroup,
    variant,
    itemType: format,
    newStem: stem,
    newAnswerChoices: choices,
    correctAnswerIndexes: correctIndexes,
    correctAnswerText: correctIndexes.map((index) => choices[index]),
    newRationale: rationale,
    whyWrong,
    tags: [...new Set(["private-draft", "needs-review", strategy.id, ...blueprint.requiredKnowledge.map(slugify).slice(0, 5)])],
    reviewStatus: tagResult.needsTagReview || groupCategoryConflicts(blueprint.sourceGroup, tagResult.tagging) ? "needs_tag_review" : "needs_clinical_review",
    similarityRisk: "unknown_pending_check",
    tagging: tagResult.tagging,
    generationStrategy: {
      strategyId: strategy.id,
      strategyLabel: strategy.label,
      changedScenario: true,
      changedQuestionAngle: true,
      changedAnswerLogicPresentation: true,
      changedDistractorPattern: true,
      changedRationaleStructure: true,
    },
    similarityPrecheck: null,
    draftWarnings: [
      "Generated as a private draft from a concept blueprint; not production content.",
      ...blueprint.sourceWarnings.filter((warning) => !/stale quiz feedback/i.test(warning)),
    ],
  };
  draft.similarityPrecheck = similarityPrecheck(source, blueprint, draft);
  return draft;
}

function similarityPrecheck(source, blueprint, draft) {
  const sourceStem = source.questionStem || "";
  const sourceChoices = (source.answerChoices || []).join(" | ");
  const sourceRationale = source.feedbackRationale || "";
  const stemWordOverlapPercent = overlapPercent(sourceStem, draft.newStem);
  const answerChoiceWordOverlapPercent = overlapPercent(sourceChoices, (draft.newAnswerChoices || []).join(" | "));
  const rationaleWordOverlapPercent = overlapPercent(sourceRationale, draft.newRationale || "");
  const scenarioOverlap = findTerms(sourceStem)
    .filter((term) => findTerms(draft.newStem).includes(term)).length;
  const correctStats = overlapStats((source.correctAnswerText || []).join(" "), draft.correctAnswerText.join(" "));
  const roughHigh = stemWordOverlapPercent >= 32 || answerChoiceWordOverlapPercent >= 32 ||
    (correctStats.percent >= 60 && correctStats.sharedCount >= 2) || correctStats.sharedCount >= 3;
  const roughMedium = !roughHigh && (stemWordOverlapPercent >= 24 || answerChoiceWordOverlapPercent >= 24 || rationaleWordOverlapPercent >= 28);
  return {
    stemWordOverlapPercent,
    answerChoiceWordOverlapPercent,
    rationaleWordOverlapPercent,
    scenarioOverlap,
    correctAnswerPhrasingOverlap: correctStats.percent,
    correctAnswerPhrasingSharedWords: correctStats.sharedWords,
    roughRisk: roughHigh ? "high_similarity_risk" : roughMedium ? "medium_similarity_risk" : "low_similarity_risk",
  };
}

function strategyOffset(blueprint) {
  return (blueprint.questionNumber * 3) % GENERATION_STRATEGIES.length;
}

function generateDrafts(blueprint, source) {
  const variants = ["A", "B", "C"];
  const drafts = [];
  const usedStrategies = new Set();
  let offset = strategyOffset(blueprint);

  for (const variant of variants) {
    let selected = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const strategy = GENERATION_STRATEGIES[(offset + attempt) % GENERATION_STRATEGIES.length];
      if (usedStrategies.has(strategy.id) && attempt < 3) continue;
      const draft = buildStrategyVariant(blueprint, source, variant, strategy, attempt);
      if (!selected || draft.similarityPrecheck.roughRisk === "low_similarity_risk") selected = draft;
      if (draft.similarityPrecheck.roughRisk === "low_similarity_risk") break;
    }
    usedStrategies.add(selected.generationStrategy.strategyId);
    drafts.push(selected);
    offset += 4;
  }
  return drafts;
}

function openingPattern(text) {
  const normalized = normalize(text);
  if (/which of the following|which statement|which action|what is|the best way|the correct procedure/.test(normalized)) {
    return normalized.match(/which of the following|which statement|which action|what is|the best way|the correct procedure/)?.[0];
  }
  if (/using the same scenario/.test(normalized)) return "using the same scenario";
  if (/your client|a \w+ year old|when your client/.test(normalized)) return "source-client-opening";
  return normalized.split(" ").slice(0, 5).join(" ");
}

function auditDraft(source, blueprint, draft) {
  const sourceStem = source.questionStem || "";
  const sourceChoices = (source.answerChoices || []).join(" | ");
  const sourceRationale = source.feedbackRationale || "";
  const stemOverlap = overlapPercent(sourceStem, draft.newStem);
  const choiceOverlap = overlapPercent(sourceChoices, (draft.newAnswerChoices || []).join(" | "));
  const rationaleOverlap = overlapPercent(sourceRationale, draft.newRationale || "");
  const correctStats = overlapStats((source.correctAnswerText || []).join(" "), (draft.correctAnswerText || []).join(" "));
  const correctAnswerPhrasingOverlap = correctStats.percent;
  const sharedClinicalScenarioElements = findTerms(`${sourceStem} ${sourceChoices}`)
    .filter((term) => findTerms(`${draft.newStem} ${(draft.newAnswerChoices || []).join(" ")}`).includes(term));
  const sameFormat = source.questionType === draft.itemType;
  const sameCorrectPattern = JSON.stringify(source.correctAnswerIndexes || []) === JSON.stringify(draft.correctAnswerIndexes || []);
  const inferred = /inferred|missing answer key/i.test(JSON.stringify([...(blueprint.sourceWarnings || []), ...(draft.draftWarnings || [])]));
  const imageBased = /image|shown below|picture|text-only/i.test(`${sourceStem} ${JSON.stringify(blueprint.sourceWarnings || [])}`);
  const sourceStructurePreserved = openingPattern(sourceStem) === openingPattern(draft.newStem) || /using the same scenario/i.test(draft.newStem);
  const answerLogicPreservedTooClosely = ((correctAnswerPhrasingOverlap >= 60 && correctStats.sharedCount >= 2) || correctStats.sharedCount >= 3) ||
    (sameCorrectPattern && choiceOverlap >= 30);
  const distractorPatternPreservedTooClosely = choiceOverlap >= 32;
  const highSimilarity = stemOverlap >= 32 || choiceOverlap >= 32 || rationaleOverlap >= 32 ||
    sourceStructurePreserved || answerLogicPreservedTooClosely || distractorPatternPreservedTooClosely;
  const mediumSimilarity = !highSimilarity && (stemOverlap >= 24 || choiceOverlap >= 24 || rationaleOverlap >= 28 ||
    (sharedClinicalScenarioElements.length >= 3 && sameFormat && sameCorrectPattern));
  const clinicalReview = inferred && draft.itemType === "multiple_response";
  const clinicallySafe = validateTaggingObject(draft).length === 0 && !clinicalReview;
  const riskLabels = [
    clinicalReview ? "clinical_review_required" : null,
    highSimilarity ? "high_similarity_risk" : null,
    mediumSimilarity ? "medium_similarity_risk" : null,
    !clinicalReview && !highSimilarity && !mediumSimilarity ? "low_similarity_risk" : null,
  ].filter(Boolean);
  const recommendedRewriteStrategy = highSimilarity
    ? "Regenerate in concept-only mode using a different clinical setting, question angle, distractor pattern, and rationale structure."
    : clinicalReview
      ? "Require clinical review or convert to single-best-answer if the source key was inferred."
      : mediumSimilarity
        ? "Use a strategy with a different stem pattern and avoid source answer phrasing."
        : "Eligible for review as a low-similarity original draft.";

  return {
    sourceQuestionId: blueprint.sourceQuestionId,
    newQuestionId: draft.newQuestionId,
    sourceGroup: blueprint.sourceGroup,
    questionNumber: source.questionNumber,
    variant: draft.variant,
    stemWordOverlapPercent: stemOverlap,
    answerChoiceWordOverlapPercent: choiceOverlap,
    rationaleWordOverlapPercent: rationaleOverlap,
    correctAnswerPhrasingOverlapPercent: correctAnswerPhrasingOverlap,
    sharedClinicalScenarioElements,
    questionFormatChanged: !sameFormat,
    patientDetailsChanged: true,
    correctAnswerLogicChangedTooMuch: !draft.correctAnswerIndexes?.length,
    clinicallySafe,
    tooCloseToSource: highSimilarity,
    needsManualReview: clinicalReview || highSimilarity || !clinicallySafe,
    sourceStructurePreserved,
    answerLogicPreservedTooClosely,
    distractorPatternPreservedTooClosely,
    recommendedRewriteStrategy,
    imageBasedSourceConvertedToClinicalUse: imageBased && !/what is the item|identify/i.test(draft.newStem),
    riskLabels,
    primaryRiskLabel: riskLabels.includes("clinical_review_required")
      ? "clinical_review_required"
      : riskLabels.includes("high_similarity_risk")
        ? "high_similarity_risk"
        : riskLabels.includes("medium_similarity_risk")
          ? "medium_similarity_risk"
          : "low_similarity_risk",
  };
}

async function processRawFile(rawPath) {
  const loadedRaw = await readJson(rawPath);
  const slug = groupSlugFromRawPath(rawPath);
  const sourceGroup = sourceGroupForSlug(slug);
  const raw = loadedRaw.map((record) => withSourceGroup(record, sourceGroup));
  if (isGroupRawPath(rawPath)) {
    await writeJson(path.join(DIRS.sourceRaw, "groups", `${slug}_raw.json`), raw);
  }
  const report = validateQuiz(raw, slug);
  await writeJson(outputPathFor(rawPath, DIRS.validationReports, slug, "validation_report"), report);

  const blueprints = raw.map((record) => inferBlueprint(record, slug));
  await writeJson(outputPathFor(rawPath, DIRS.blueprints, slug, "blueprints"), blueprints);

  const sourceById = new Map(raw.map((record) => [`${slug}_q${String(record.questionNumber).padStart(3, "0")}`, record]));
  const drafts = blueprints.flatMap((blueprint) => generateDrafts(blueprint, sourceById.get(blueprint.sourceQuestionId)));
  await writeJson(outputPathFor(rawPath, DIRS.originalDrafts, slug, "original_drafts"), drafts);

  const taggingIssues = [
    ...blueprints.flatMap((blueprint) =>
      validateTaggingObject(blueprint).map((issue) => ({
        itemId: blueprint.sourceQuestionId,
        itemKind: "blueprint",
        issue,
      }))
    ),
    ...drafts.flatMap((draft) =>
      validateTaggingObject(draft).map((issue) => ({
        itemId: draft.newQuestionId,
        itemKind: "original_draft",
        issue,
      }))
    ),
  ];
  if (taggingIssues.length > 0) {
    report.status = "review_required";
    report.issues.push(...taggingIssues.map((issue) => ({ code: "tagging_issue", ...issue })));
    await writeJson(outputPathFor(rawPath, DIRS.validationReports, slug, "validation_report"), report);
  }

  const blueprintById = new Map(blueprints.map((blueprint) => [blueprint.sourceQuestionId, blueprint]));
  const audits = drafts.map((draft) => auditDraft(sourceById.get(draft.sourceQuestionId), blueprintById.get(draft.sourceQuestionId), draft));
  await writeJson(outputPathFor(rawPath, DIRS.similarityAudits, slug, "similarity_audit"), audits);

  const reviewQueue = drafts
    .map((draft) => ({ draft, audit: audits.find((audit) => audit.newQuestionId === draft.newQuestionId) }))
    .filter(({ draft, audit }) => draft.reviewStatus === "needs_tag_review" || audit.needsManualReview || !audit.riskLabels.includes("low_similarity_risk"))
    .map(({ draft, audit }) => ({
      ...draft,
      audit,
      reviewStatus: draft.reviewStatus === "needs_tag_review" ? "needs_tag_review" : "needs_clinical_review",
    }));
  await writeJson(outputPathFor(rawPath, DIRS.clinicalReviewQueue, slug, "clinical_review_queue"), reviewQueue);

  const approved = drafts
    .map((draft) => ({ draft, audit: audits.find((audit) => audit.newQuestionId === draft.newQuestionId) }))
    .filter(({ draft, audit }) =>
      draft.reviewStatus === "reviewed_approved" &&
      audit.riskLabels.includes("low_similarity_risk") &&
      !audit.needsManualReview
    )
    .map(({ draft }) => {
      const clone = { ...draft };
      delete clone.sourceQuestionId;
      delete clone.draftWarnings;
      return clone;
    });
  await writeJson(path.join(DIRS.approvedQuestions, `${slug}_approved_questions.json`), approved);

  return {
    slug,
    sourceGroup,
    rawCount: raw.length,
    validationStatus: report.status,
    blueprintCount: blueprints.length,
    draftCount: drafts.length,
    taggingIssueCount: taggingIssues.length,
    auditCount: audits.length,
    reviewQueueCount: reviewQueue.length,
    approvedExportCount: approved.length,
  };
}

function countBy(items, fn) {
  const counts = {};
  for (const item of items) {
    const key = fn(item) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function topTags(drafts, limit = 20) {
  const counts = new Map();
  for (const draft of drafts) {
    const tagging = draft.tagging || {};
    for (const group of ["topicTags", "populationTags", "safetyTags", "skillTags", "bodySystemTags"]) {
      for (const tag of tagging[group] || []) {
        const key = `${tag.id}|${tag.label}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => {
      const [id, label] = key.split("|");
      return { id, label, count };
    })
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, limit);
}

function markdownTable(rows, headers) {
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
  ];
  for (const row of rows) lines.push(`| ${headers.map((header) => row[header] ?? "").join(" | ")} |`);
  return lines.join("\n");
}

function batchSummaryMarkdown({ raw, blueprints, drafts, audits, queue, report, results, examples, blocker }) {
  const riskCounts = countBy(audits, (audit) => audit.primaryRiskLabel);
  const groupCounts = countBy(raw, (record) => record.sourceGroup?.groupName);
  const typeCounts = countBy(drafts, (draft) => draft.itemType);
  const warningCounts = Object.entries(
    raw.reduce((acc, record) => {
      const group = record.sourceGroup?.groupName || "unknown";
      acc[group] = (acc[group] || 0) + (record.warnings || []).length;
      return acc;
    }, {})
  ).map(([group, count]) => ({ Group: group, Warnings: count }));
  const groupRows = Object.entries(groupCounts).map(([group, count]) => ({ Group: group, Questions: count }));
  const tagRows = topTags(drafts).map((tag) => ({ Tag: tag.id, Label: tag.label, Count: tag.count }));
  const exampleRows = examples.map((item) => ({
    ID: item.draft.newQuestionId,
    Group: item.draft.sourceGroup?.groupName,
    Strategy: item.draft.generationStrategy?.strategyLabel,
    "Stem overlap": item.audit.stemWordOverlapPercent,
    "Choice overlap": item.audit.answerChoiceWordOverlapPercent,
  }));

  return [
    "# Batch 100 Pipeline Summary",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    blocker ? `> Extraction blocker: ${blocker}` : "",
    "",
    "## Counts",
    "",
    `- Raw question count: ${raw.length}`,
    `- Group count: ${Object.keys(groupCounts).length}`,
    `- Blueprint count: ${blueprints.length}`,
    `- Original draft count: ${drafts.length}`,
    `- Clinical review queue count: ${queue.length}`,
    `- Missing tag issues: ${report.issues.filter((issue) => issue.code === "tagging_issue").length}`,
    `- Unsupported item types: ${report.issues.filter((issue) => issue.code === "unsupported_item_type").length}`,
    `- Generator failures: ${report.issues.filter((issue) => issue.code === "generator_failure").length}`,
    "",
    "## Similarity Risk Counts",
    "",
    markdownTable(Object.entries(riskCounts).map(([risk, count]) => ({ Risk: risk, Count: count })), ["Risk", "Count"]),
    "",
    "## Questions Per Group",
    "",
    markdownTable(groupRows, ["Group", "Questions"]),
    "",
    "## Question Type Distribution",
    "",
    markdownTable(Object.entries(typeCounts).map(([type, count]) => ({ Type: type, Count: count })), ["Type", "Count"]),
    "",
    "## Top 20 Tags",
    "",
    markdownTable(tagRows, ["Tag", "Label", "Count"]),
    "",
    "## Warning Count Per Group",
    "",
    markdownTable(warningCounts, ["Group", "Warnings"]),
    "",
    "## Example Low-Risk Drafts",
    "",
    exampleRows.length ? markdownTable(exampleRows, ["ID", "Group", "Strategy", "Stem overlap", "Choice overlap"]) : "No low-risk examples available.",
    "",
    "## Processed Group Files",
    "",
    markdownTable(results.map((result) => ({
      Slug: result.slug,
      Group: result.sourceGroup?.groupName,
      Raw: result.rawCount,
      Drafts: result.draftCount,
      Queue: result.reviewQueueCount,
    })), ["Slug", "Group", "Raw", "Drafts", "Queue"]),
    "",
  ].filter((line) => line !== "").join("\n");
}

async function writeBatchOutputs(results) {
  const raw = [];
  const blueprints = [];
  const drafts = [];
  const audits = [];
  const queue = [];

  for (const result of results) {
    raw.push(...await readJson(path.join(DIRS.sourceRaw, "groups", `${result.slug}_raw.json`)));
    blueprints.push(...await readJson(path.join(DIRS.blueprints, "groups", `${result.slug}_blueprints.json`)));
    drafts.push(...await readJson(path.join(DIRS.originalDrafts, "groups", `${result.slug}_original_drafts.json`)));
    audits.push(...await readJson(path.join(DIRS.similarityAudits, "groups", `${result.slug}_similarity_audit.json`)));
    queue.push(...await readJson(path.join(DIRS.clinicalReviewQueue, "groups", `${result.slug}_clinical_review_queue.json`)));
  }

  const report = {
    slug: EXTRACTION_BATCH_ID,
    generatedAt: new Date().toISOString(),
    status: raw.length >= 85 ? "pass" : "partial_batch_auth_required",
    recordCount: raw.length,
    groupCount: new Set(raw.map((record) => record.sourceGroup?.groupSlug)).size,
    issues: [
      ...(raw.length < 85 ? [{ code: "batch_target_not_met", expectedApproximateCount: 100, actualCount: raw.length }] : []),
    ],
    warnings: [
      ...(raw.length < 100 ? [{ code: "additional_group_extraction_needed", message: "Batch is below the approximate 100-question target; extract additional Qbank groups and rerun offline-all." }] : []),
    ],
  };
  const lowRiskExamples = audits
    .filter((audit) => audit.primaryRiskLabel === "low_similarity_risk")
    .slice(0, 5)
    .map((audit) => ({ audit, draft: drafts.find((draft) => draft.newQuestionId === audit.newQuestionId) }));

  await writeJson(path.join(DIRS.sourceRaw, `${EXTRACTION_BATCH_ID}_raw.json`), raw);
  await writeJson(path.join(DIRS.validationReports, `${EXTRACTION_BATCH_ID}_validation_report.json`), report);
  await writeJson(path.join(DIRS.blueprints, `${EXTRACTION_BATCH_ID}_blueprints.json`), blueprints);
  await writeJson(path.join(DIRS.originalDrafts, `${EXTRACTION_BATCH_ID}_original_drafts.json`), drafts);
  await writeJson(path.join(DIRS.similarityAudits, `${EXTRACTION_BATCH_ID}_similarity_audit.json`), audits);
  await writeJson(path.join(DIRS.clinicalReviewQueue, `${EXTRACTION_BATCH_ID}_clinical_review_queue.json`), queue);
  await fs.mkdir(DIRS.batchReports, { recursive: true });
  await fs.writeFile(path.join(DIRS.batchReports, `${EXTRACTION_BATCH_ID}_summary.md`), batchSummaryMarkdown({
    raw,
    blueprints,
    drafts,
    audits,
    queue,
    report,
    results,
    examples: lowRiskExamples,
    blocker: raw.length < 100 ? "Batch is below the approximate 100-question target; extract additional Qbank groups and rerun offline-all." : "",
  }), "utf8");

  return {
    rawCount: raw.length,
    groupCount: report.groupCount,
    blueprintCount: blueprints.length,
    draftCount: drafts.length,
    auditCount: audits.length,
    reviewQueueCount: queue.length,
    riskCounts: countBy(audits, (audit) => audit.primaryRiskLabel),
    validationStatus: report.status,
  };
}

async function processAll() {
  await ensureDirs();
  await seedKnownGroupRawFiles();
  const rawFiles = await listRawJsonFiles();
  const results = [];
  for (const rawPath of rawFiles) {
    results.push(await processRawFile(rawPath));
  }
  const batch = await writeBatchOutputs(results);
  await writeJson(path.join(ROOT, "pipeline_run_summary.json"), {
    generatedAt: new Date().toISOString(),
    sourceRawFiles: rawFiles.length,
    results,
    batch,
    note: "Raw source and traceability files are private analysis artifacts. Only reviewed low-risk drafts may be exported.",
  });
  return results;
}

async function exportApprovedOnly() {
  await ensureDirs();
  const reviewFiles = (await fs.readdir(DIRS.clinicalReviewQueue, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith("_clinical_review_queue.json"));
  const results = [];
  for (const entry of reviewFiles) {
    const queuePath = path.join(DIRS.clinicalReviewQueue, entry.name);
    const queue = await readJson(queuePath);
    const slug = entry.name.replace(/_clinical_review_queue\.json$/, "");
    const approved = queue
      .filter((item) =>
        item.reviewStatus === "reviewed_approved" &&
        item.audit?.riskLabels?.includes("low_similarity_risk") &&
        !item.audit?.needsManualReview
      )
      .map((item) => {
        const clone = { ...item };
        delete clone.sourceQuestionId;
        delete clone.audit;
        delete clone.draftWarnings;
        return clone;
      });
    await writeJson(path.join(DIRS.approvedQuestions, `${slug}_approved_questions.json`), approved);
    results.push({ slug, approvedExportCount: approved.length });
  }
  return results;
}

async function main() {
  const command = process.argv[2] || "offline-all";
  if (command === "init") {
    await ensureDirs();
    return { status: "initialized", root: ROOT, dirs: DIRS };
  }
  if (command === "offline-all") {
    return { status: "processed", results: await processAll() };
  }
  if (command === "export-approved") {
    return { status: "exported", results: await exportApprovedOnly() };
  }
  throw new Error(`Unknown command: ${command}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(await main(), null, 2));
}

export { DIRS, processAll, processRawFile, exportApprovedOnly };
