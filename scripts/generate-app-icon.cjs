/* eslint-disable @typescript-eslint/no-require-imports -- Node script uses the installed sharp dependency to generate the Windows icon from its SVG source. */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const svg = fs.readFileSync(path.join(projectRoot, 'public', 'icon.svg'));
  const png = await sharp(svg).resize(256, 256).png().toBuffer();

  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Icon resource
  header.writeUInt16LE(1, 4); // One image
  header.writeUInt8(0, 6); // 256 pixels
  header.writeUInt8(0, 7); // 256 pixels
  header.writeUInt8(0, 8); // True-color palette
  header.writeUInt8(0, 9); // Reserved
  header.writeUInt16LE(1, 10); // Color planes
  header.writeUInt16LE(32, 12); // Bits per pixel
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18);

  const iconPath = path.join(projectRoot, 'public', 'icon.ico');
  fs.writeFileSync(iconPath, Buffer.concat([header, png]));
  console.log(`Generated ${iconPath}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
