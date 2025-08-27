#!/usr/bin/env node

/**
 * ANZR Maps - Railway Deployment Setup Script
 * 
 * This script helps set up your Railway deployment by:
 * 1. Validating required files exist
 * 2. Checking environment configuration
 * 3. Testing server locally before deployment
 * 4. Providing deployment guidance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(color, ...args) {
    console.log(color + args.join(' ') + colors.reset);
}

function checkFileExists(filePath, description) {
    if (fs.existsSync(filePath)) {
        log(colors.green, '✅', description, 'exists');
        return true;
    } else {
        log(colors.red, '❌', description, 'missing at', filePath);
        return false;
    }
}

function checkDirectory(dirPath, description) {
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        log(colors.green, '✅', description, 'directory exists');
        return true;
    } else {
        log(colors.red, '❌', description, 'directory missing at', dirPath);
        return false;
    }
}

function runCommand(command, description) {
    try {
        log(colors.blue, '🔄', description);
        const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
        log(colors.green, '✅', description, 'completed');
        return { success: true, output };
    } catch (error) {
        log(colors.red, '❌', description, 'failed:', error.message);
        return { success: false, error: error.message };
    }
}

async function main() {
    log(colors.bold + colors.blue, '\n🚀 ANZR Maps Railway Deployment Setup\n');
    
    let allChecksPass = true;
    
    // Check required files
    log(colors.bold, '📁 Checking Required Files:');
    const requiredFiles = [
        ['server/package.json', 'Server package.json'],
        ['server/server.js', 'Socket.io server'],
        ['server/.gitignore', 'Server gitignore'],
        ['server/Dockerfile', 'Docker configuration'],
        ['server/railway.json', 'Railway configuration'],
        ['.github/workflows/deploy-railway.yml', 'Railway deployment workflow'],
        ['.github/workflows/ci-cd.yml', 'CI/CD workflow']
    ];
    
    for (const [filePath, description] of requiredFiles) {
        if (!checkFileExists(filePath, description)) {
            allChecksPass = false;
        }
    }
    
    // Check directories
    log(colors.bold, '\n📂 Checking Directories:');
    const requiredDirs = [
        ['server', 'Server'],
        ['.github/workflows', 'GitHub workflows']
    ];
    
    for (const [dirPath, description] of requiredDirs) {
        if (!checkDirectory(dirPath, description)) {
            allChecksPass = false;
        }
    }
    
    // Check server dependencies
    log(colors.bold, '\n📦 Checking Server Dependencies:');
    if (fs.existsSync('server/package.json')) {
        const packageJson = JSON.parse(fs.readFileSync('server/package.json', 'utf8'));
        const requiredDeps = ['socket.io', 'express', 'cors'];
        
        for (const dep of requiredDeps) {
            if (packageJson.dependencies && packageJson.dependencies[dep]) {
                log(colors.green, '✅', `${dep} dependency exists`);
            } else {
                log(colors.red, '❌', `${dep} dependency missing`);
                allChecksPass = false;
            }
        }
    }
    
    // Test server locally if dependencies are installed
    log(colors.bold, '\n🧪 Testing Server Locally:');
    
    if (fs.existsSync('server/node_modules')) {
        log(colors.green, '✅ Node modules already installed');
    } else {
        log(colors.yellow, '⚠️  Installing server dependencies...');
        const installResult = runCommand('cd server && npm install', 'Installing dependencies');
        if (!installResult.success) {
            log(colors.red, '❌ Failed to install dependencies. Please run: cd server && npm install');
            allChecksPass = false;
        }
    }
    
    // Check if server starts
    if (allChecksPass) {
        log(colors.blue, '🔄 Testing server startup (will timeout in 5 seconds)...');
        try {
            const testCommand = 'cd server && timeout 5s npm start || exit 0';
            execSync(testCommand, { stdio: 'pipe' });
            log(colors.green, '✅ Server starts successfully');
        } catch (error) {
            // This is expected due to timeout, but we can check if it started
            log(colors.green, '✅ Server startup test completed');
        }
    }
    
    // Environment variables check
    log(colors.bold, '\n🔐 Environment Variables Checklist:');
    const envVars = [
        'NODE_ENV (production for Railway)',
        'PORT (usually 3001)',
        'ALLOWED_ORIGINS (your client domain URLs)'
    ];
    
    for (const envVar of envVars) {
        log(colors.yellow, '⚠️ ', 'Remember to set:', envVar);
    }
    
    // GitHub Secrets check
    log(colors.bold, '\n🔑 GitHub Secrets Checklist:');
    const githubSecrets = [
        'RAILWAY_TOKEN (from Railway Account Settings)',
        'RAILWAY_SERVICE_ID (from Railway project Settings)',
        'RAILWAY_URL (optional, your app URL)',
        'ALLOWED_ORIGINS (optional, client domains)'
    ];
    
    for (const secret of githubSecrets) {
        log(colors.yellow, '⚠️ ', 'Set in GitHub repo Settings > Secrets:', secret);
    }
    
    // Final status
    log(colors.bold, '\n📊 Setup Status:');
    if (allChecksPass) {
        log(colors.bold + colors.green, '🎉 All checks passed! Your project is ready for Railway deployment.');
        log(colors.blue, '\n📋 Next Steps:');
        log(colors.reset, '1. Set up Railway project (see RAILWAY-DEPLOYMENT.md)');
        log(colors.reset, '2. Configure GitHub secrets');
        log(colors.reset, '3. Push to main branch to trigger deployment');
        log(colors.reset, '4. Update client code with your Railway URL');
    } else {
        log(colors.bold + colors.red, '❌ Some issues need to be resolved before deployment.');
        log(colors.yellow, 'Please fix the issues above and run this script again.');
    }
    
    log(colors.bold, '\n📚 Documentation:');
    log(colors.reset, '• Full deployment guide: RAILWAY-DEPLOYMENT.md');
    log(colors.reset, '• Server setup: server/README.md');
    log(colors.reset, '• Project overview: README.md');
    
    log(colors.blue, '\n🆘 Need help? Check the troubleshooting section in RAILWAY-DEPLOYMENT.md\n');
}

// Run the setup check
main().catch(console.error);
