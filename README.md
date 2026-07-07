# One-Click Account Swapper

A secure, premium Chrome Extension (Manifest V3) that allows users to capture, encrypt, and switch between multiple website accounts (Claude, ChatGPT, Gmail, GitHub, Discord, Notion, Slack, and more) with a single click.

Built using **Next.js, Tailwind CSS, Framer Motion, Zustand, and TypeScript**.

## 🔒 Security Architecture
- **AES-GCM-256**: All saved cookie and storage session data is encrypted locally using AES-GCM.
- **PBKDF2 Key Derivation**: Encryption keys are derived dynamically from a user-supplied Master Password using PBKDF2 (100,000 iterations of SHA-256).
- **RAM-Only Master Password**: The Master Password is cached strictly in memory (RAM) and never saved to local disk, preventing offline data theft.
- **No Servers**: All operations run locally inside the extension.

## 🚀 Getting Started

### 📦 Prerequisites
Install the dependencies:
```bash
npm install
```

### 🛠️ Development & Building
To start compiling changes locally or build the extension output package:

**Build for Chrome:**
```bash
npm run build
```
This script will:
1. Compile the TypeScript Background Service Worker (`src/background/index.ts`) using `esbuild`.
2. Bundle the Next.js static pages into `out/`.
3. Process all output HTML files to extract inline hydration scripts into separate `.js` files, ensuring complete compliance with the Manifest V3 Content Security Policy (CSP).

### 🔌 How to Load the Extension in Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `out/` folder in this project's root directory.
5. Pin the extension to your toolbar and click to open!
