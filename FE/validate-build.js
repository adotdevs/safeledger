/**
 * Quick validation script to check if Electron build configuration is correct
 * Run: node validate-build.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Electron Build Configuration...\n');

let errors = [];
let warnings = [];

// Check 1: package.json exists and has correct structure
console.log('1. Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check main entry point
  if (!packageJson.main || packageJson.main !== 'main.js') {
    errors.push('❌ package.json missing or incorrect "main": "main.js"');
  } else {
    console.log('   ✅ main.js configured');
  }
  
  // Check electron-builder config
  if (!packageJson.build) {
    errors.push('❌ package.json missing "build" configuration');
  } else {
    console.log('   ✅ build configuration exists');
    
    // Check NSIS config doesn't have PNG icons
    if (packageJson.build.nsis) {
      const nsis = packageJson.build.nsis;
      if (nsis.installerIcon && nsis.installerIcon.includes('.png')) {
        errors.push('❌ NSIS installerIcon cannot be PNG (must be ICO or removed)');
      }
      if (nsis.uninstallerIcon && nsis.uninstallerIcon.includes('.png')) {
        errors.push('❌ NSIS uninstallerIcon cannot be PNG (must be ICO or removed)');
      }
      if (nsis.installerHeaderIcon && nsis.installerHeaderIcon.includes('.png')) {
        errors.push('❌ NSIS installerHeaderIcon cannot be PNG (must be ICO or removed)');
      }
      if (!nsis.installerIcon && !nsis.uninstallerIcon) {
        console.log('   ✅ NSIS icons removed (will use defaults - OK)');
      }
    }
  }
  
  // Check required files
  console.log('\n2. Checking required files...');
  const requiredFiles = ['main.js', 'preload.js', 'public/icon.png'];
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file} exists`);
    } else {
      errors.push(`❌ Required file missing: ${file}`);
    }
  });
  
  // Check build folder exists
  console.log('\n3. Checking build folder...');
  if (fs.existsSync('build')) {
    console.log('   ✅ build folder exists');
    const buildIndex = path.join('build', 'index.html');
    if (fs.existsSync(buildIndex)) {
      console.log('   ✅ build/index.html exists');
    } else {
      warnings.push('⚠️  build/index.html not found - run "npm run build" first');
    }
  } else {
    warnings.push('⚠️  build folder not found - run "npm run build" first');
  }
  
  // Check dist-electron folder status
  console.log('\n4. Checking dist-electron folder...');
  if (fs.existsSync('dist-electron')) {
    const distFiles = fs.readdirSync('dist-electron');
    if (distFiles.length > 0) {
      warnings.push('⚠️  dist-electron folder exists - consider cleaning it first');
      console.log('   ⚠️  dist-electron folder has files (might cause conflicts)');
    }
  } else {
    console.log('   ✅ dist-electron folder is clean (doesn\'t exist)');
  }
  
  // Check disk space (basic check)
  console.log('\n5. Quick validation complete');
  
} catch (error) {
  errors.push(`❌ Error reading package.json: ${error.message}`);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('VALIDATION SUMMARY');
console.log('='.repeat(50));

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✅ All checks passed! Build should work.\n');
  console.log('Run: npm run electron:build:win');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log('\n❌ ERRORS (must fix):');
    errors.forEach(err => console.log(`   ${err}`));
  }
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (optional):');
    warnings.forEach(warn => console.log(`   ${warn}`));
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Build will fail! Fix errors above first.\n');
    process.exit(1);
  } else {
    console.log('\n✅ No critical errors! Build should work (warnings are optional).\n');
    console.log('Run: npm run electron:build:win');
    process.exit(0);
  }
}
