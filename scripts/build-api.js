// Build script to bundle Express backend for Vercel Serverless Function
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');

// Locate esbuild from frontend, backend, or root
let esbuild;
try {
  const esbuildPath = require.resolve('esbuild', {
    paths: [path.join(rootDir, 'frontend'), path.join(rootDir, 'backend'), rootDir],
  });
  esbuild = require(esbuildPath);
} catch {
  console.error('[BUILD-API] esbuild not found in dependencies. Installing or running fallback...');
}

const apiDir = path.join(rootDir, 'api');
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

console.log('[BUILD-API] Bundling backend/src/app.ts into api/index.js...');

if (esbuild) {
  try {
    esbuild.buildSync({
      entryPoints: [path.join(rootDir, 'backend', 'src', 'app.ts')],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      outfile: path.join(apiDir, 'index.js'),
      footer: {
        js: 'module.exports = module.exports.default || module.exports;',
      },
      sourcemap: false,
      minify: false,
    });
    console.log('[BUILD-API] Successfully generated api/index.js for Vercel deployment');
  } catch (err) {
    console.error('[BUILD-API] esbuild failed:', err);
    process.exit(1);
  }
} else {
  console.error('[BUILD-API] Cannot bundle without esbuild');
  process.exit(1);
}
