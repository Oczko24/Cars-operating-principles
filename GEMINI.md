# CRITICAL RULES FOR ALL AI AGENTS

## 🚨 ABSOLUTE ZERO-TOLERANCE: NEVER DUMP TEMPORARY FILES IN REPO ROOT

1. **NO SCRATCH / TEST / DIAGNOSTIC FILES IN THE REPOSITORY ROOT OR SOURCE DIRS**:
   - Never create files like `test_server.js`, `test_puppeteer.js`, `test.py`, `script.js` in the project root.
   - Never create marker / flag files (e.g., `fwd-resolved`, `fwd-fix-done`, `done.txt`, `flag.tmp`) in the repo root or anywhere in tracked directories.

2. **ALL TEMPORARY FILES MUST GO TO `temp/` OR `tmp/`**:
   - If you need to run a test script, write a benchmark, inspect 3D meshes with puppeteer, or write temporary logs, put them strictly inside `temp/` or `tmp/`.
   - The directories `temp/` and `tmp/` are git-ignored.

3. **CLEAN UP AFTER YOURSELF**:
   - Whenever you create a temporary script or log inside `temp/`, delete it immediately after running it.
   - Do not leave garbage behind. Keep the repository structure pristine at all times.

