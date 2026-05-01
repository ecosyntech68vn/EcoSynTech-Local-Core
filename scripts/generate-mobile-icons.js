/**
 * Generate mobile app icons for iOS/Android from a vector logo.
 * Usage: node scripts/generate-mobile-icons.js <input-logo> <output-dir>
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const input = process.argv[2] || path.join(__dirname, '..', 'public', 'logo.svg');
const outDir = process.argv[3] || path.join(__dirname, '..', 'public', 'assets', 'mobile-icons');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  await ensureDir(outDir);
  // Common icon sizes (adjust as needed per platform)
  const icons = [
    { name: 'icon-192.png', w: 192, h: 192 },
    { name: 'icon-512.png', w: 512, h: 512 },
    { name: 'icon-1024.png', w: 1024, h: 1024 }
  ];

  for (const i of icons) {
    await sharp(input)
      .resize(i.w, i.h)
      .png()
      .toFile(path.join(outDir, i.name));
  }
  console.log('Icons generated in', outDir);
}

main().catch(err => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
