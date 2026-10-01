const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../out');

function processHtmlFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let scriptCount = 0;
  const baseName = path.basename(filePath, '.html');
  const htmlDir = path.dirname(filePath);

  // Regex to find script tags
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

  const newContent = content.replace(scriptRegex, (match, attrs, code) => {
    // If it has a src attribute, it's not inline
    if (/src\s*=/i.test(attrs)) {
      return match;
    }

    // Ignore empty script tags
    if (!code.trim()) {
      return match;
    }

    // Extract inline script to a page-specific external file
    const jsFileName = `${baseName}-inline-${scriptCount++}.js`;
    const jsFilePath = path.join(htmlDir, jsFileName);

    fs.writeFileSync(jsFilePath, code, 'utf8');

    // Replace with external script tag
    return `<script src="./${jsFileName}"></script>`;
  });

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Processed: ${path.relative(outDir, filePath)} (extracted ${scriptCount} scripts)`);
}

function traverseAndProcessHtml(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverseAndProcessHtml(fullPath);
    } else if (file.endsWith('.html')) {
      processHtmlFile(fullPath);
    }
  }
}

function replaceInFile(filePath, searchRegex, replaceStr) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  if (searchRegex.test(content)) {
    content = content.replace(searchRegex, replaceStr);
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

function replaceInAllFiles(dir, searchRegex, replaceStr) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      replaceInAllFiles(fullPath, searchRegex, replaceStr);
    } else if (/\.(html|js|css|json)$/i.test(file)) {
      replaceInFile(fullPath, searchRegex, replaceStr);
    }
  }
}

function removePathSafe(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(targetPath);
  }
}

async function runPostBuild() {
  console.log(`[Post-Build] Starting processing in: ${outDir}`);

  // 1. Clean up unwanted files and directories with underscore prefix before processing
  // (Chromium forbids folder names starting with '_' except _locales and _metadata)
  const unwanted = [
    path.join(outDir, '_not-found'),
    path.join(outDir, '_not-found.html'),
    path.join(outDir, '_not-found.txt'),
    path.join(outDir, '404.html'),
  ];
  for (const p of unwanted) {
    if (fs.existsSync(p)) {
      removePathSafe(p);
      console.log(`[Post-Build] Cleaned up: ${path.basename(p)}`);
    }
  }

  // Remove next metadata txt files
  if (fs.existsSync(outDir)) {
    const rootFiles = fs.readdirSync(outDir);
    for (const file of rootFiles) {
      if (file.startsWith('__next.') || (file.endsWith('.txt') && file.startsWith('__next'))) {
        removePathSafe(path.join(outDir, file));
      }
    }
  }

  // 2. Extract inline scripts for CSP compliance
  traverseAndProcessHtml(outDir);

  // 3. Rename '_next' folder to 'next_assets' (Chrome disallows folders starting with '_')
  const oldNextDir = path.join(outDir, '_next');
  const newNextDir = path.join(outDir, 'next_assets');

  if (fs.existsSync(oldNextDir)) {
    if (fs.existsSync(newNextDir)) {
      removePathSafe(newNextDir);
    }
    fs.renameSync(oldNextDir, newNextDir);
    console.log('[Post-Build] Renamed _next -> next_assets');
  }

  // 4. Update asset paths across all output files
  // Replace '/_next/' with '/next_assets/' and '_next/' with 'next_assets/'
  console.log('[Post-Build] Updating asset paths across all files...');
  replaceInAllFiles(outDir, /\/_next\//g, '/next_assets/');
  replaceInAllFiles(outDir, /"_next\//g, '"next_assets/');
  replaceInAllFiles(outDir, /'_next\//g, "'next_assets/");

  // In HTML files, ensure favicon is relative
  const htmlFiles = [path.join(outDir, 'index.html')];
  for (const htmlFile of htmlFiles) {
    if (fs.existsSync(htmlFile)) {
      let content = fs.readFileSync(htmlFile, 'utf8');
      content = content.replace(/href="\/favicon\.ico/g, 'href="./favicon.ico');
      fs.writeFileSync(htmlFile, content, 'utf8');
    }
  }

  // 5. Ensure manifest.json and icons are correctly positioned in out/
  const publicDir = path.join(__dirname, '../public');
  const manifestSrc = path.join(publicDir, 'manifest.json');
  const manifestDest = path.join(outDir, 'manifest.json');
  if (fs.existsSync(manifestSrc)) {
    fs.copyFileSync(manifestSrc, manifestDest);
    console.log('[Post-Build] Copied manifest.json to out/');
  }

  const iconsSrcDir = path.join(publicDir, 'icons');
  const iconsDestDir = path.join(outDir, 'icons');
  if (fs.existsSync(iconsSrcDir)) {
    if (!fs.existsSync(iconsDestDir)) {
      fs.mkdirSync(iconsDestDir, { recursive: true });
    }
    const iconFiles = fs.readdirSync(iconsSrcDir);
    for (const iconFile of iconFiles) {
      fs.copyFileSync(
        path.join(iconsSrcDir, iconFile),
        path.join(iconsDestDir, iconFile)
      );
    }
    console.log('[Post-Build] Copied icons to out/icons/');
  }

  // 6. Ensure background.js is present in out/
  const bgSrc = path.join(publicDir, 'background.js');
  const bgDest = path.join(outDir, 'background.js');
  if (fs.existsSync(bgSrc)) {
    fs.copyFileSync(bgSrc, bgDest);
    console.log('[Post-Build] Copied background.js to out/');
  }

  console.log('[Post-Build] Extension packaging completed successfully!');
}

runPostBuild().catch((err) => {
  console.error('[Post-Build] Error:', err);
  process.exit(1);
});
