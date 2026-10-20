const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const srcStatic = path.join(projectDir, '.next', 'static');
const destStatic = path.join(projectDir, '.next', 'standalone', '.next', 'static');

const srcPublic = path.join(projectDir, 'public');
const destPublic = path.join(projectDir, '.next', 'standalone', 'public');

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
