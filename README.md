# One-Click Account Swapper

A secure, premium Chrome Extension (Manifest V3) that allows users to capture, encrypt, and switch between multiple website accounts (Claude, ChatGPT, Gemini, Gmail, GitHub, Discord, Notion, Slack, and more) with a single click.

Built using **Next.js, Tailwind CSS, Framer Motion, Zustand, and TypeScript**.

## 🔒 Security Architecture
- **AES-GCM-256**: All saved cookie and storage session data is encrypted locally using AES-GCM.
- **PBKDF2 Key Derivation**: Encryption keys are derived dynamically from a user-supplied Master Password using PBKDF2 (100,000 iterations of SHA-256).
- **RAM-Only Master Password**: The Master Password is cached strictly in memory (RAM via `chrome.storage.session`) for the browser session and never saved to disk, preventing offline data theft.
- **No External Servers**: All operations run locally inside the extension.

## 🚀 Getting Started

### 📦 Prerequisites
Install the dependencies:
```bash
npm install
```

### 🛠️ Development & Building

**Build the Unpacked Extension:**
```bash
npm run build
```
This script will:
1. Generate multi-resolution icons (16px, 32px, 48px, 128px) in `public/icons/`.
2. Compile the TypeScript Background Service Worker (`src/background/index.ts`) using `esbuild`.
3. Bundle the Next.js static pages with Turbopack into `out/`.
4. Run `scripts/post-build.js` to:
   - Extract inline hydration scripts into separate `.js` files to comply with Manifest V3 CSP.
   - Clean up unnecessary Next.js metadata and underscore-prefixed directories (`_not-found`).
   - Rename `_next` to `next_assets` and rewrite asset references to comply with Chromium extension directory rules.
   - Synchronize `manifest.json`, `icons/`, and `background.js` into `out/`.

**Package into a Distributable ZIP:**
```bash
npm run package
```
Creates `dist/one-click-account-swapper.zip` ready for distribution or the Chrome Web Store.

### 🔌 How to Load the Extension in Chrome / Edge / Brave

1. Open Google Chrome (or Edge / Brave) and navigate to `chrome://extensions/` (or `edge://extensions/`).
2. Toggle **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `out/` folder in this project's root directory:
   `c:\Users\kunal\Documents\antigravity\hopeful-pythagoras\out`
5. Pin **One-Click Account Swapper** to your toolbar and click to open!

### ⌨️ Keyboard Shortcuts
- **`Alt+Shift+Right`**: Quick swap to the next saved account on the active website directly from anywhere in the browser.
