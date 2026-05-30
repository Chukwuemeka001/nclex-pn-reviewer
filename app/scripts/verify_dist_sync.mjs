#!/usr/bin/env node
// Verifies the committed GitHub Pages deploy artifact at the repo root is
// internally consistent: every asset that root index.html references must exist
// under the repo-root assets/ directory. Catches the "blank screen after
// deploy" class of bug where index.html points at a hashed bundle that was
// never copied/committed. Base-path agnostic: it keys off the "/assets/"
// segment, not a hardcoded base.
//
// Exit 0 = in sync. Exit 1 = a referenced asset is missing.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const indexPath = join(repoRoot, "index.html");

if (!existsSync(indexPath)) {
  console.error(`[verify_dist_sync] FAIL: root index.html not found at ${indexPath}`);
  process.exit(1);
}

const html = readFileSync(indexPath, "utf8");
const refs = [...html.matchAll(/(?:src|href)\s*=\s*"([^"]*\/assets\/[^"]+)"/g)].map((m) => m[1]);

if (refs.length === 0) {
  console.error("[verify_dist_sync] FAIL: root index.html references no /assets/ bundles. Did the deploy copy run?");
  process.exit(1);
}

const missing = [];
for (const ref of refs) {
  const rel = ref.slice(ref.indexOf("assets/")); // strip base prefix → assets/<file>
  const abs = join(repoRoot, rel);
  if (!existsSync(abs)) missing.push({ ref, expected: rel });
}

if (missing.length) {
  console.error("[verify_dist_sync] FAIL: root index.html references assets that do not exist at repo root:");
  for (const m of missing) console.error(`  - ${m.ref}  ->  missing ${m.expected}`);
  console.error("Run `npm run build:pages` from app/ and commit index.html + assets/ together.");
  process.exit(1);
}

console.log(`[verify_dist_sync] OK: ${refs.length} referenced asset(s) present at repo root.`);
for (const ref of refs) console.log(`  - ${ref.slice(ref.indexOf("assets/"))}`);
