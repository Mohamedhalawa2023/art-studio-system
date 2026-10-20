const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetExe = path.join(process.env.LOCALAPPDATA, 'Programs', 'marsam', 'مرسم - إدارة المرسم.exe');
const desktopPath = path.join(process.env.USERPROFILE, 'Desktop');
const shortcutPath = path.join(desktopPath, 'مرسم للفنون.lnk');

console.log('Target Exe exists:', fs.existsSync(targetExe), targetExe);

const vbsContent = [
  'Set oWS = WScript.CreateObject("WScript.Shell")',
  'sLinkFile = "' + shortcutPath + '"',
  'Set oLink = oWS.CreateShortcut(sLinkFile)',
  'oLink.TargetPath = "' + targetExe + '"',
  'oLink.WorkingDirectory = "' + path.dirname(targetExe) + '"',
  'oLink.Description = "نظام إدارة مرسم للفنون"',
  'oLink.IconLocation = "' + targetExe + ',0"',
  'oLink.Save'
].join('\r\n');

const vbsFile = path.join(process.env.TEMP, 'make_shortcut.vbs');
// Use windows-1256 or unicode for VBS
fs.writeFileSync(vbsFile, vbsContent, { encoding: 'utf16le' });

try {
  const out = execSync(`cscript //nologo "${vbsFile}"`, { encoding: 'utf-8' });
  console.log('VBS executed:', out);
} catch (e) {
  console.error('Error running VBS:', e);
}

// Also verify with powershell reading the shortcut
const psVerifyScript = [
  '$sh = New-Object -ComObject WScript.Shell',
  '$lnk = $sh.CreateShortcut("' + shortcutPath.replace(/\\/g, '\\\\') + '")',
  'Write-Output "TargetPath: " + $lnk.TargetPath',
  'Write-Output "WorkingDir: " + $lnk.WorkingDirectory'
].join('\r\n');

const psFile = path.join(process.env.TEMP, 'verify_shortcut.ps1');
fs.writeFileSync(psFile, psVerifyScript, 'utf8');

try {
  const psOut = execSync(`powershell -ExecutionPolicy Bypass -File "${psFile}"`, { encoding: 'utf8' });
  console.log('PowerShell Verification:\n' + psOut);
} catch (e) {
  console.error('Error verifying shortcut:', e);
}
