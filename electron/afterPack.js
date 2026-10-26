const fs = require('fs');
const path = require('path');

exports.default = async function (context) {
  const appOutDir = context.appOutDir;
  const projectDir = (context.packager && context.packager.projectDir) || process.cwd();
  const nextOutputDir = process.env.MARSAM_NEXT_DIST_DIR || '.next-release-build';
  const nextOutputPath = path.join(projectDir, nextOutputDir);
  const srcStandalone = path.join(nextOutputPath, 'standalone');
  const destStandalone = path.join(appOutDir, 'resources', 'standalone');
  const sourceIcon = path.join(projectDir, 'public', 'icon.ico');
  
  console.log('[afterPack] Ensuring 100% of standalone files & node_modules exist in:', destStandalone);
  
  if (!fs.existsSync(path.join(srcStandalone, 'server.js'))) {
    throw new Error(`[afterPack] Standalone server.js is missing: ${srcStandalone}`);
  }
  if (!fs.existsSync(sourceIcon)) {
    throw new Error(`[afterPack] Windows application icon is missing: ${sourceIcon}`);
  }

  fs.cpSync(srcStandalone, destStandalone, { recursive: true, force: true });
  console.log('[afterPack] Standalone directory copied successfully with all dependencies.');
    
  // Copy .next/static into destination
  const srcStatic = path.join(nextOutputPath, 'static');
  const destStatic = path.join(destStandalone, '.next', 'static');
  if (fs.existsSync(srcStatic)) {
    fs.mkdirSync(path.dirname(destStatic), { recursive: true });
    fs.cpSync(srcStatic, destStatic, { recursive: true, force: true });
    console.log('[afterPack] Copied .next/static to destination.');
  }

  // Copy public into destination
  const srcPublic = path.join(projectDir, 'public');
  const destPublic = path.join(destStandalone, 'public');
  if (fs.existsSync(srcPublic)) {
    fs.mkdirSync(destPublic, { recursive: true });
    fs.cpSync(srcPublic, destPublic, { recursive: true, force: true });
    console.log('[afterPack] Copied public to destination.');
  }

  // Fail packaging if the embedded runtime is incomplete.
  const nextModule = path.join(destStandalone, 'node_modules', 'next');
  if (!fs.existsSync(nextModule)) {
    throw new Error(`[afterPack] Next.js runtime is missing: ${nextModule}`);
  }
  console.log('[afterPack] Verified Next.js module exists in destination.');
};
