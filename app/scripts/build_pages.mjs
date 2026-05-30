#!/usr/bin/env node
// One command to produce the GitHub Pages deploy artifact correctly, so the
// base path is never forgotten (the documented "blank screen" bug) and the
// dist->root copy is never partial. Steps:
//   1. vite build with the Pages base path baked in
//   2. copy app/dist/index.html and app/dist/assets/* to the repo root
//   3. verify root index.html references only assets that now exist
// After this, commit index.html + assets/ together.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..");
const repoRoot = resolve(here, "../..");
const distDir = join(appRoot, "dist");
const base = process.env.VITE_BASE_PATH || "/nclex-pn-reviewer/";

console.log(`[build_pages] building with VITE_BASE_PATH=${base}`);
execFileSync("npm", ["run", "build"], {
  cwd: appRoot,
  stdio: "inherit",
  env: { ...process.env, VITE_BASE_PATH: base },
});

// Replace root index.html with the freshly built one.
cpSync(join(distDir, "index.html"), join(repoRoot, "index.html"));

// Rebuild root assets/ from dist so stale hashed bundles never linger.
const rootAssets = join(repoRoot, "assets");
rmSync(rootAssets, { recursive: true, force: true });
mkdirSync(rootAssets, { recursive: true });
const distAssets = join(distDir, "assets");
for (const name of readdirSync(distAssets)) {
  cpSync(join(distAssets, name), join(rootAssets, name));
}

console.log("[build_pages] copied dist -> repo root. Verifying sync...");
execFileSync("node", [join(here, "verify_dist_sync.mjs")], { stdio: "inherit" });
console.log("[build_pages] done. Review and commit: git add index.html assets/ && git commit");
