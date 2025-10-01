#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Icon sizes needed
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconDir = path.join(__dirname, '../public/icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// SVG template for the app icon
// Simple design with brand color and "R" for Roofing
const createIconSVG = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0066cc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0052a3;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
  <text
    x="50%"
    y="50%"
    font-family="Arial, sans-serif"
    font-size="${size * 0.6}"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
    dominant-baseline="central"
  >R</text>
</svg>
`;

// Create maskable icon SVG (with safe area padding)
const createMaskableIconSVG = (size) => {
  const padding = size * 0.2; // 20% padding for maskable icons
  const innerSize = size - (padding * 2);
  return `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0066cc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0052a3;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)"/>
  <text
    x="50%"
    y="50%"
    font-family="Arial, sans-serif"
    font-size="${innerSize * 0.6}"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
    dominant-baseline="central"
  >R</text>
</svg>
`;
};

// Generate icons
async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n');

  // Generate regular icons
  for (const size of sizes) {
    const svg = Buffer.from(createIconSVG(size));
    const outputPath = path.join(iconDir, `icon-${size}x${size}.png`);

    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✓ Created icon-${size}x${size}.png`);
  }

  // Generate maskable icons (192x192 and 512x512)
  const maskableSizes = [192, 512];
  for (const size of maskableSizes) {
    const svg = Buffer.from(createMaskableIconSVG(size));
    const outputPath = path.join(iconDir, `icon-${size}x${size}-maskable.png`);

    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✓ Created icon-${size}x${size}-maskable.png`);
  }

  // Generate shortcut icons (96x96)
  const shortcutIcons = [
    { name: 'contact', emoji: '👤' },
    { name: 'camera', emoji: '📷' }
  ];

  for (const { name, emoji } of shortcutIcons) {
    const size = 96;
    const svg = Buffer.from(`
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#0066cc"/>
        <text
          x="50%"
          y="50%"
          font-size="${size * 0.5}"
          text-anchor="middle"
          dominant-baseline="central"
        >${emoji}</text>
      </svg>
    `);

    const outputPath = path.join(iconDir, `shortcut-${name}.png`);

    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✓ Created shortcut-${name}.png`);
  }

  console.log('\n✅ All icons generated successfully!');
  console.log(`📁 Icons saved to: ${iconDir}`);
}

generateIcons().catch(err => {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
});
