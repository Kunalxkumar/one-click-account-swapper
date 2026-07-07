const esbuild = require('esbuild');
const path = require('path');

async function build() {
  try {
    await esbuild.build({
      entryPoints: [path.join(__dirname, '../src/background/index.ts')],
      outfile: path.join(__dirname, '../public/background.js'),
      bundle: true,
      minify: false, // Keep it readable for debugging in development if needed, or set to true for production
      format: 'esm',
      target: ['chrome100'],
      platform: 'browser',
    });
    console.log('Successfully compiled background.ts to public/background.js');
  } catch (err) {
    console.error('Compilation failed:', err);
    process.exit(1);
  }
}

build();
