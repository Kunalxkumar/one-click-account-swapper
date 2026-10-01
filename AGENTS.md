<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:chrome-extension-mv3-rules -->
# Next.js Manifest V3 Chrome Extension Invariants

1. **Chromium Directory Restrictions**:
   - Chromium forbids directories starting with `_` (e.g. `_next`).
   - Run the post-build pipeline (`node scripts/post-build.js`) to rename `_next` to `next_assets` across all output files.
   - Asset prefix replacement in JS chunks must be `/next_assets/` (NOT `./next_assets/`) to satisfy Next.js `document.currentScript.src` invariants under the `chrome-extension://` scheme.

2. **CSP & Inline Scripts**:
   - MV3 forbids inline `<script>` tags. Extract all inline scripts to page-scoped external files (e.g. `index-inline-*.js`) before packing.
   - Clean up Next.js 404/not-found artifacts (`_not-found.html`, `404.html`) so they do not collide with or overwrite root page scripts.

3. **Cookie API Constraints**:
   - When calling `chrome.cookies.set()`, omit `domain` if `cookie.hostOnly || cookie.name.startsWith("__Host-")` to avoid Chrome API rejection.

4. **Session Persistence**:
   - Persist temporary memory (like master passwords or decrypted states) in `chrome.storage.session` rather than volatile component state to survive popup window close/open cycles without disk persistence.
<!-- END:chrome-extension-mv3-rules -->
