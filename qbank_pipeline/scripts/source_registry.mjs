import fs from "node:fs";
import path from "node:path";

export const REQUIRED_SOURCE_FIELDS = [
  "sourceId",
  "title",
  "url",
  "sourceType",
  "license",
  "allowedUse",
  "prohibitedUse",
  "attributionRequired",
  "checkedAt",
  "status",
  "notes",
];

const UNSAFE_SOURCE_PATTERN = /\b(leaked|brain\s*dump|dump|real\s+nclex|actual\s+nclex|uworld|archer|kaplan|ati|hesi|evolve|saunders|bootcamp|simplenursing|simple\s*nursing|nurseachieve|picmonic|paid\s*qbank|screenshot|pdf\s*dump)\b/i;
const APPROVED_STATUSES = new Set(["approved_reference", "framework_reference_only", "approved_oer", "public_domain_reference"]);

function asText(value) {
  if (Array.isArray(value)) return value.join(" ");
  if (value === null || value === undefined) return "";
  return String(value);
}

export function validateSourceEntry(entry = {}) {
  const issues = [];
  for (const field of REQUIRED_SOURCE_FIELDS) {
    const value = entry[field];
    if (Array.isArray(value) && value.length === 0) issues.push(`Missing required field: ${field}`);
    else if (value === undefined || value === null || value === "") issues.push(`Missing required field: ${field}`);
  }

  if (entry.sourceId && !/^[a-z0-9][a-z0-9-]*$/.test(entry.sourceId)) {
    issues.push("sourceId must be lowercase kebab-case");
  }
  if (entry.url && !/^https?:\/\//.test(entry.url)) {
    issues.push("url must start with http:// or https://");
  }
  if (entry.allowedUse && !Array.isArray(entry.allowedUse)) issues.push("allowedUse must be an array");
  if (entry.prohibitedUse && !Array.isArray(entry.prohibitedUse)) issues.push("prohibitedUse must be an array");
  if (typeof entry.attributionRequired !== "boolean") issues.push("attributionRequired must be boolean");
  if (entry.attributionRequired && !entry.attributionText) issues.push("attributionText required when attributionRequired is true");

  const combinedRiskText = [
    entry.sourceId,
    entry.title,
    entry.url,
    entry.license,
    asText(entry.allowedUse),
    asText(entry.prohibitedUse),
    entry.attributionText,
    entry.notes,
  ].join(" ");

  if (APPROVED_STATUSES.has(entry.status) && UNSAFE_SOURCE_PATTERN.test(combinedRiskText)) {
    issues.push("unsafe source risk: approved/reference sources cannot be leaked, proprietary qbank, paid screenshot/PDF, or real-exam dump material");
  }

  return {
    sourceId: entry.sourceId || "unknown",
    issues,
    safeForConceptUse: issues.length === 0 && APPROVED_STATUSES.has(entry.status),
  };
}

export function validateSourceRegistry(entries = []) {
  const issues = [];
  const seen = new Set();
  const entryResults = entries.map((entry, index) => {
    const result = validateSourceEntry(entry);
    if (seen.has(entry.sourceId)) issues.push(`Duplicate sourceId: ${entry.sourceId}`);
    if (entry.sourceId) seen.add(entry.sourceId);
    for (const issue of result.issues) issues.push(`${entry.sourceId || `entry_${index}`}: ${issue}`);
    return result;
  });
  return {
    valid: issues.length === 0,
    issues,
    entryResults,
    summary: summarizeSourceRegistry(entries),
  };
}

export function summarizeSourceRegistry(entries = []) {
  const bySourceType = {};
  const byStatus = {};
  const byLicense = {};
  let attributionRequired = 0;
  for (const entry of entries) {
    bySourceType[entry.sourceType || "unknown"] = (bySourceType[entry.sourceType || "unknown"] || 0) + 1;
    byStatus[entry.status || "unknown"] = (byStatus[entry.status || "unknown"] || 0) + 1;
    byLicense[entry.license || "unknown"] = (byLicense[entry.license || "unknown"] || 0) + 1;
    if (entry.attributionRequired) attributionRequired += 1;
  }
  return { total: entries.length, bySourceType, byStatus, byLicense, attributionRequired };
}

export function loadSourceRegistry(registryPath = new URL("../source_registry.json", import.meta.url)) {
  return JSON.parse(fs.readFileSync(registryPath, "utf8"));
}

function main() {
  const args = new Set(process.argv.slice(2));
  const registryArg = process.argv.find((arg) => arg.startsWith("--registry="));
  const registryPath = registryArg ? registryArg.split("=")[1] : path.resolve("qbank_pipeline/source_registry.json");
  const entries = loadSourceRegistry(registryPath);
  const result = validateSourceRegistry(entries);
  console.log(JSON.stringify(result, null, 2));
  if (args.has("--validate") && !result.valid) process.exitCode = 1;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}
