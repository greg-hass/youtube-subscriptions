#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building YouTube Subscriptions Manager for Desktop...');

// Clean previous builds
console.log('🧹 Cleaning previous builds...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
if (fs.existsSync('release')) {
  fs.rmSync('release', { recursive: true, force: true });
}
if (fs.existsSync('out')) {
  fs.rmSync('out', { recursive: true, force: true });
}

// Build Next.js app for production
console.log('📦 Building Next.js app...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Next.js build completed');
} catch (error) {
  console.error('❌ Next.js build failed:', error.message);
  process.exit(1);
}

// Compile TypeScript main process
console.log('🔨 Compiling Electron main process...');
try {
  execSync('npx tsc -p tsconfig.main.json', { stdio: 'inherit' });
  console.log('✅ Main process compiled');
} catch (error) {
  console.error('❌ Main process compilation failed:', error.message);
  process.exit(1);
}

// Copy preload script and other assets
console.log('📋 Copying assets...');
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Copy preload script
if (fs.existsSync('public/preload.js')) {
  fs.copyFileSync('public/preload.js', 'dist/preload.js');
}

// Copy icon
if (fs.existsSync('public/icon.svg')) {
  fs.copyFileSync('public/icon.svg', 'dist/icon.svg');
}

console.log('✅ Build completed successfully!');
console.log('\n🎯 Next steps:');
console.log('  - Run "npm run electron:pack" to create distributable packages');
console.log('  - Run "npm run electron:dev" for development testing');