const fs = require('fs');
const path = require('path');

exports.default = async function (context) {
  const appOutDir = context.appOutDir;
  const projectDir = (context.packager && context.packager.projectDir) || process.cwd();
  const srcStandalone = path.join(projectDir, '.next', 'standalone');
  const destStandalone = path.join(appOutDir, 'resources', 'standalone');
  
  console.log('[afterPack] Ensuring 100% of standalone files & node_modules exist in:', destStandalone);
  
  if (fs.existsSync(srcStandalone)) {
    fs.cpSync(srcStandalone, destStandalone, { recursive: true, force: true });
    console.log('[afterPack] Standalone directory copied successfully with all dependencies.');
    
    // Copy .next/static into destination
    const srcStatic = path.join(projectDir, '.next', 'static');
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
  } else {
    console.error('[afterPack] Source standalone directory not found at:', srcStandalone);
  }

  // Also verify next exists
  const nextModule = path.join(destStandalone, 'node_modules', 'next');
  if (fs.existsSync(nextModule)) {
    console.log('[afterPack] Verified next module exists in destination.');
  } else {
    console.error('[afterPack] WARNING: next module not found in destination!');
  }
};
