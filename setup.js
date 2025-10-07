#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up PocketFlow-JS for Cursor AI assistance...');

// Copy .cursorrules to project root
const cursorrulesPath = path.join(__dirname, '.cursorrules');
const projectRoot = process.cwd();
const targetPath = path.join(projectRoot, '.cursorrules');

if (!fs.existsSync(targetPath)) {
    fs.copyFileSync(cursorrulesPath, targetPath);
    console.log('✅ .cursorrules copied to project root');
} else {
    console.log('⚠️  .cursorrules already exists in project root');
}

// Copy examples to project (optional)
const examplesDir = path.join(projectRoot, 'pocketflow-examples');
if (!fs.existsSync(examplesDir)) {
    fs.mkdirSync(examplesDir, { recursive: true });
    
    // Copy example files
    const examplesSource = path.join(__dirname, 'examples');
    const exampleFiles = fs.readdirSync(examplesSource);
    
    exampleFiles.forEach(file => {
        if (file.endsWith('.js')) {
            const sourceFile = path.join(examplesSource, file);
            const targetFile = path.join(examplesDir, file);
            fs.copyFileSync(sourceFile, targetFile);
        }
    });
    
    console.log('✅ Examples copied to pocketflow-examples/');
}

console.log('🎉 PocketFlow-JS setup complete!');
console.log('📝 Your Cursor AI will now have PocketFlow context when coding.');
