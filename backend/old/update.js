/**
 * Update script for the random image server
 * This script helps update dependencies to the latest versions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('====================================');
console.log('Random Image Server - Update');
console.log('====================================');

// Check if package.json exists
if (!fs.existsSync(path.join(__dirname, 'package.json'))) {
  console.error('Error: package.json not found. Please run this script from the backend directory.');
  process.exit(1);
}

// Update dependencies
try {
  console.log('Checking for dependency updates...');
  
  // Capture the output to check for updates
  const output = execSync('npm outdated', { encoding: 'utf8' });
  
  if (output.trim().length === 0) {
    console.log('All dependencies are up to date!');
  } else {
    console.log('Updating dependencies...');
    execSync('npm update', { stdio: 'inherit' });
    console.log('Dependencies updated successfully!');
  }
  
  // Reinstall if needed
  console.log('Ensuring all dependencies are properly installed...');
  execSync('npm install express cors dotenv chokidar', { stdio: 'inherit' });
  
  console.log('\nUpdate complete!');
  console.log('\nYou can now run one of the server versions:');
  console.log('  - Basic: node server.js');
  console.log('  - Optimized: node server-optimized.js');
  console.log('  - Advanced: node server-advanced.js');
} catch (error) {
  console.error('Error updating dependencies:', error.message);
} 