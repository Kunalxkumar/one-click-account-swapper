const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outDir = path.resolve(__dirname, '../out');
const distDir = path.resolve(__dirname, '../dist');
const zipFile = path.join(distDir, 'one-click-account-swapper.zip');

if (!fs.existsSync(outDir)) {
  console.error('[Package] "out" directory does not exist. Please run "npm run build" first.');
  process.exit(1);
}

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

try {
  console.log(`[Package] Creating ZIP archive from ${outDir}...`);
  execSync(`powershell -Command "Compress-Archive -Path '${outDir}\\*' -DestinationPath '${zipFile}' -Force"`, {
    stdio: 'inherit',
  });
  const stats = fs.statSync(zipFile);
  console.log(`[Package] Successfully created: dist/one-click-account-swapper.zip (${(stats.size / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.error('[Package] Failed to create ZIP archive:', err);
  process.exit(1);
}
