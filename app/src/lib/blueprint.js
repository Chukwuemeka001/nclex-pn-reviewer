export const PLAN_VERSION = "2026-PN";

// Canonical 2026 NCLEX-PN client-needs taxonomy.
// Categories with [] have no subcategory in the PN plan.
export const CLIENT_NEEDS = {
  "Safe and Effective Care Environment": [
    "Coordinated Care",
    "Safety and Infection Prevention and Control",
  ],
  "Health Promotion and Maintenance": [],
  "Psychosocial Integrity": [],
  "Physiological Integrity": [
    "Basic Care and Comfort",
    "Pharmacological and Parenteral Therapies",
    "Reduction of Risk Potential",
    "Physiological Adaptation",
  ],
};

// Stale label -> canonical 2026 label.
export const SUBCATEGORY_ALIASES = {
  "Safety and Infection Control": "Safety and Infection Prevention and Control",
};

export function canonicalSubcategory(value = "") {
  const v = String(value || "").trim();
  return SUBCATEGORY_ALIASES[v] || v;
}

export function isKnownClientNeeds(clientNeeds = "") {
  return Object.prototype.hasOwnProperty.call(CLIENT_NEEDS, String(clientNeeds || "").trim());
}

export function isKnownSubcategory(clientNeeds = "", subcategory = "") {
  const cn = String(clientNeeds || "").trim();
  const subs = CLIENT_NEEDS[cn];
  if (!subs) return false;
  if (subs.length === 0) return !subcategory; // category has no subcategory
  return subs.includes(canonicalSubcategory(subcategory));
}

// Build the blueprintRef object from an item's `tags`.
// Returns { planVersion, clientNeeds, subcategory, objectiveText, valid, issues[] }.
export function buildBlueprintRef(tags = {}) {
  const clientNeeds = String(tags.clientNeeds || "").trim();
  const subcategory = canonicalSubcategory(tags.subcategory || "");
  const issues = [];
  if (!isKnownClientNeeds(clientNeeds)) issues.push(`unknown clientNeeds: "${clientNeeds}"`);
  else if (!isKnownSubcategory(clientNeeds, subcategory)) issues.push(`subcategory not valid for ${clientNeeds}: "${subcategory}"`);
  return {
    planVersion: PLAN_VERSION,
    clientNeeds: clientNeeds || null,
    subcategory: subcategory || null,
    objectiveText: String(tags.objectiveText || ""),
    valid: issues.length === 0,
    issues,
  };
}
