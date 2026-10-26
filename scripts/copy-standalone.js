const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const nextOutputDir = process.env.MARSAM_NEXT_DIST_DIR || '.next-release-build';
const nextOutputPath = path.join(projectDir, nextOutputDir);
const srcStatic = path.join(nextOutputPath, 'static');
const destStatic = path.join(nextOutputPath, 'standalone', '.next', 'static');

const srcPublic = path.join(projectDir, 'public');
const destPublic = path.join(nextOutputPath, 'standalone', 'public');

console.log('[copy-standalone] Copying static assets to standalone folder...');

if (fs.existsSync(srcStatic)) {
  fs.mkdirSync(path.dirname(destStatic), { recursive: true });
  fs.cpSync(srcStatic, destStatic, { recursive: true, force: true });
  console.log('[copy-standalone] Copied .next/static successfully.');
}

if (fs.existsSync(srcPublic)) {
  fs.mkdirSync(destPublic, { recursive: true });
  fs.cpSync(srcPublic, destPublic, { recursive: true, force: true });
  console.log('[copy-standalone] Copied public assets successfully.');
}
