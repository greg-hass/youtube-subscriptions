#!/usr/bin/env node

/**
 * YouTube Subscriptions Manager - Setup Script
 * 
 * This script helps developers quickly set up the project by:
 * 1. Checking prerequisites
 * 2. Creating environment files
 * 3. Installing dependencies
 * 4. Providing setup guidance
 */

import fs from 'fs';
import { execSync } from 'child_process';
import readline from 'readline';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step}. ${message}`, 'bright');
  log('─'.repeat(50), 'cyan');
}

function checkPrerequisites() {
  logStep(1, 'Checking Prerequisites');
  
  // Check Node.js version
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      log(`❌ Node.js version ${nodeVersion} is too old. Please upgrade to Node.js 18 or later.`, 'red');
      process.exit(1);
    }
    
    log(`✅ Node.js ${nodeVersion}`, 'green');
  } catch {
    log('❌ Node.js is not installed. Please install Node.js 18 or later.', 'red');
    process.exit(1);
  }
  
  // Check npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    log(`✅ npm ${npmVersion}`, 'green');
  } catch {
    log('❌ npm is not installed.', 'red');
    process.exit(1);
  }
  
  // Check if git is initialized
  if (!fs.existsSync('.git')) {
    log('⚠️  Git repository not initialized. Consider running: git init', 'yellow');
  } else {
    log('✅ Git repository initialized', 'green');
  }
}

function setupEnvironment() {
  logStep(2, 'Setting Up Environment');
  
  const envLocalPath = '.env.local';
  
  if (fs.existsSync(envLocalPath)) {
    log('⚠️  .env.local already exists', 'yellow');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('Do you want to overwrite it? (y/N): ', (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        createEnvFile();
      } else {
        log('Skipping environment file creation', 'yellow');
      }
      rl.close();
      installDependencies();
    });
  } else {
    createEnvFile();
    installDependencies();
  }
}

function createEnvFile() {
  const envExamplePath = '.env.local.example';
  
  if (!fs.existsSync(envExamplePath)) {
    log('❌ .env.local.example not found', 'red');
    process.exit(1);
  }
  
  try {
    fs.copyFileSync(envExamplePath, '.env.local');
    log('✅ Created .env.local from template', 'green');
    
    log('\n📝 Next steps:', 'bright');
    log('1. Open .env.local and add your Google OAuth credentials', 'cyan');
    log('2. Follow the setup guide: docs/YOUTUBE_API_SETUP.md', 'cyan');
    log('3. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_CLIENT_SECRET', 'cyan');
  } catch (error) {
    log(`❌ Failed to create .env.local: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red');
    process.exit(1);
  }
}

function installDependencies() {
  logStep(3, 'Installing Dependencies');
  
  try {
    log('Installing npm packages...', 'blue');
    execSync('npm install', { stdio: 'inherit' });
    log('✅ Dependencies installed successfully', 'green');
  } catch {
    log('❌ Failed to install dependencies', 'red');
    log('Try running: npm install manually', 'yellow');
    process.exit(1);
  }
  
  validateSetup();
}

function validateSetup() {
  logStep(4, 'Validating Setup');
  
  // Check if critical files exist
  const criticalFiles = [
    'package.json',
    '.env.local',
    'src/lib/youtube.ts',
    'src/lib/env-validation.ts',
  ];
  
  let allFilesExist = true;
  
  for (const file of criticalFiles) {
    if (fs.existsSync(file)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ ${file} is missing`, 'red');
      allFilesExist = false;
    }
  }
  
  if (!allFilesExist) {
    log('\n❌ Setup validation failed. Some files are missing.', 'red');
    process.exit(1);
  }
  
  // Check environment variables (basic validation)
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const hasClientId = envContent.includes('NEXT_PUBLIC_GOOGLE_CLIENT_ID=');
    const hasClientSecret = envContent.includes('NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=');
    
    if (hasClientId && hasClientSecret) {
      log('✅ Environment variables structure is correct', 'green');
    } else {
      log('⚠️  Environment variables may be missing', 'yellow');
    }
  } catch {
    log('⚠️  Could not validate environment variables', 'yellow');
  }
  
  showNextSteps();
}

function showNextSteps() {
  logStep(5, 'Next Steps');
  
  log('\n🚀 Your project is almost ready!', 'bright');
  log('\n📋 Complete these steps to finish setup:', 'cyan');
  
  log('\n1. Configure Google OAuth:', 'yellow');
  log('   📖 Read: docs/YOUTUBE_API_SETUP.md');
  log('   🔗 Go to: https://console.cloud.google.com/');
  log('   📝 Add your credentials to .env.local');
  
  log('\n2. Start development:', 'yellow');
  log('   💻 Run: npm run dev');
  log('   🌐 Open: http://localhost:3000');
  
  log('\n3. Test the application:', 'yellow');
  log('   🔐 Click "Sign in with Google"');
  log('   👤 Grant permissions to access YouTube data');
  log('   📊 View your subscriptions and profile');
  
  log('\n📚 Additional Resources:', 'cyan');
  log('   📖 Development Guide: docs/DEVELOPMENT_SETUP.md');
  log('   🚀 Deployment Guide: docs/PRODUCTION_DEPLOYMENT.md');
  log('   🔐 OAuth Details: docs/GOOGLE_OAUTH_SETUP.md');
  
  log('\n🛠️  Useful Commands:', 'cyan');
  log('   npm run dev          - Start development server');
  log('   npm run lint         - Check code quality');
  log('   npm run type-check   - Validate TypeScript');
  log('   npm run build        - Build for production');
  
  log('\n✨ Happy coding!', 'bright');
  log('   If you need help, check the documentation or open an issue.', 'blue');
}

// Main execution
function main() {
  log('🎬 YouTube Subscriptions Manager - Setup Script', 'bright');
  log('==========================================', 'cyan');
  
  checkPrerequisites();
  setupEnvironment();
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n\n👋 Setup cancelled by user', 'yellow');
  process.exit(0);
});

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  checkPrerequisites,
  setupEnvironment,
  validateSetup,
  showNextSteps,
};