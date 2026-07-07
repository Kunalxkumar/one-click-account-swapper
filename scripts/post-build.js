const fs = require('fs');
const path = require('path');

function processHtmlFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let scriptCount = 0;
  
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
    
    // Extract inline script to a external file
    const htmlDir = path.dirname(filePath);
    const jsFileName = `inline-${scriptCount++}.js`;
    const jsFilePath = path.join(htmlDir, jsFileName);
    
    fs.writeFileSync(jsFilePath, code, 'utf8');
    
    // Replace with external script tag
    return `<script src="./${jsFileName}"></script>`;
  });
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Processed: ${path.relative(path.join(__dirname, '..'), filePath)} (extracted ${scriptCount} scripts)`);
}

function traverse(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverse(fullPath);
    } else if (file.endsWith('.html')) {
      processHtmlFile(fullPath);
    }
  }
}

const outDir = path.join(__dirname, '../out');
console.log(`Starting inline script extraction in: ${outDir}`);
traverse(outDir);
console.log('Inline script extraction completed successfully.');
