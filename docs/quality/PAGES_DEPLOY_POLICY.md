# GitHub Pages Deploy Policy (Canonical)

This repo serves from **root `index.html` + root `assets/`**.
The source build is under `app/`.

Canonical deploy command:

```bash
cd app
npm run release:pages
```

What it does:
1. Build with repo base path (`VITE_BASE_PATH=/nclex-pn-reviewer/`)
2. Sync `app/dist` -> repo root (`index.html`, `assets/`)
3. Verify root artifact references are internally consistent

CI enforcement:
- Workflow `quality-gates` runs `npm run verify:pages-fresh`
- That command rebuilds the canonical artifact and fails if committed root `index.html/assets` are stale versus source.

Practical rule:
- If app source affects frontend behavior/build output, run `npm run release:pages` and commit resulting root `index.html/assets` in the same PR/commit set.
