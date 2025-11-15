// Simple script to generate placeholder icons for Chrome extension
// Run with: node generate-icons.js

const fs = require('fs');
const path = require('path');

// This creates simple colored PNG files as placeholders
// For production, replace with proper icon images

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('🎨 Generating placeholder icons...\n');

// Create simple SVG and convert to PNG using data URLs
// For simplicity, we'll create base64 PNG data

sizes.forEach(size => {
  const filename = `icon${size}.png`;
  const filepath = path.join(iconsDir, filename);
  
  // Create a simple colored square as placeholder
  // This is a 1x1 purple pixel PNG, Chrome will scale it
  const purplePNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4z8DwHwAFBQIE9RwOWwAAAABJRU5ErkJggg==',
    'base64'
  );
  
  fs.writeFileSync(filepath, purplePNG);
  console.log(`✅ Created: ${filename} (${size}x${size})`);
});

console.log('\n🎉 Done! Placeholder icons created.');
console.log('⚠️  Note: These are simple placeholders. For production, use proper icon designs.');
console.log('📖 See CREATE_ICONS.md for how to create better icons.\n');

