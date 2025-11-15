// Build script to prepare Chrome extension
const fs = require('fs-extra');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const publicDir = path.join(__dirname, '..', 'public');
const manifestPath = path.join(__dirname, '..', 'manifest.json');

console.log('📦 Preparing Chrome Extension...\n');

try {
  // Copy manifest.json to build folder
  const manifestDest = path.join(buildDir, 'manifest.json');
  fs.copyFileSync(manifestPath, manifestDest);
  console.log('✅ Copied manifest.json');

  // Copy icons if they exist
  const iconsDir = path.join(publicDir, 'icons');
  if (fs.existsSync(iconsDir)) {
    const iconsDest = path.join(buildDir, 'icons');
    fs.copySync(iconsDir, iconsDest);
    console.log('✅ Copied icons');
  } else {
    console.log('ℹ️  No icons folder found (optional)');
  }

  // Copy popup.html if needed
  const popupHtml = path.join(publicDir, 'popup.html');
  if (fs.existsSync(popupHtml)) {
    const popupDest = path.join(buildDir, 'popup.html');
    fs.copyFileSync(popupHtml, popupDest);
    console.log('✅ Copied popup.html');
  }

  console.log('\n✅ Chrome Extension build complete!');
  console.log(`📁 Extension folder: ${buildDir}`);
  console.log('\n📋 Next steps:');
  console.log('   1. Open Chrome: chrome://extensions/');
  console.log('   2. Enable Developer mode');
  console.log('   3. Click "Load unpacked"');
  console.log('   4. Select the "build" folder\n');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

