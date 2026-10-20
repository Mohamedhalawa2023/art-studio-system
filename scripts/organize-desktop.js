const fs = require('fs');
const path = require('path');

const desktopDir = path.join(process.env.USERPROFILE, 'Desktop');
const installersFolder = path.join(desktopDir, '📁 ملفات التثبيت (لأول مرة فقط)');

console.log('Organizing Desktop for Marsam...');

// 1. Create installers folder
if (!fs.existsSync(installersFolder)) {
  fs.mkdirSync(installersFolder, { recursive: true });
  console.log('Created folder:', installersFolder);
}

// 2. Move setup files into installers folder
const filesToMove = ['Marsam-Setup.exe', 'مرسم - إدارة المرسم Setup.exe'];
for (const f of filesToMove) {
  const src = path.join(desktopDir, f);
  if (fs.existsSync(src)) {
    const dest = path.join(installersFolder, f);
    fs.copyFileSync(src, dest);
    fs.unlinkSync(src);
    console.log(`Moved ${f} -> 📁 ملفات التثبيت (لأول مرة فقط)`);
  }
}

// 3. Remove obsolete 6KB Marsam.exe
const oldStub = path.join(desktopDir, 'Marsam.exe');
if (fs.existsSync(oldStub) && fs.statSync(oldStub).size < 50000) {
  fs.unlinkSync(oldStub);
  console.log('Removed old stub Marsam.exe');
}

// 4. Copy Portable version to Desktop
const srcPortable = path.join(__dirname, '..', 'dist', 'Marsam-Portable.exe');
const destPortable = path.join(desktopDir, 'مرسم للفنون (نسخة محمولة بدون تثبيت).exe');
if (fs.existsSync(srcPortable)) {
  console.log('Copying Marsam-Portable.exe to Desktop...');
  fs.copyFileSync(srcPortable, destPortable);
  console.log('Copied successfully as: مرسم للفنون (نسخة محمولة بدون تثبيت).exe');
} else {
  console.error('Portable exe not found at:', srcPortable);
}

// 5. Update rescue batch file
const rescueBatPath = path.join(desktopDir, 'إصلاح_وإنقاذ_مرسم.bat');
if (fs.existsSync(rescueBatPath)) {
  let content = fs.readFileSync(rescueBatPath, 'utf8');
  // Update path to %LOCALAPPDATA%\Programs\marsam\مرسم - إدارة المرسم.exe
  content = content.replace(/%LOCALAPPDATA%\\Programs\\مرسم - إدارة المرسم\\مرسم - إدارة المرسم\.exe/g, '%LOCALAPPDATA%\\Programs\\marsam\\مرسم - إدارة المرسم.exe');
  fs.writeFileSync(rescueBatPath, content, 'utf8');
  console.log('Updated إصلاح_وإنقاذ_مرسم.bat with correct target path.');
}

console.log('\n--- Final Desktop State ---');
fs.readdirSync(desktopDir)
  .filter(f => f.includes('مرسم') || f.includes('Marsam') || f.includes('تثبيت'))
  .forEach(f => {
    const s = fs.statSync(path.join(desktopDir, f));
    console.log(`  - ${f} (${s.isDirectory() ? 'DIR' : s.size + ' bytes'})`);
  });
