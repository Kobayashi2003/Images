/**
 * Setup script for the random image server
 * This script helps set up the environment and install dependencies
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Default values
const defaultPort = 3000;
const defaultImagePath = './images';

console.log('====================================');
console.log('Random Image Server - Setup');
console.log('====================================');

// Check if .env already exists
if (fs.existsSync(path.join(__dirname, '.env'))) {
  console.log('An .env file already exists. Do you want to overwrite it? (y/n)');
  rl.question('', (answer) => {
    if (answer.toLowerCase() === 'y') {
      createEnvFile();
    } else {
      console.log('Skipping .env file creation.');
      installDependencies();
    }
  });
} else {
  createEnvFile();
}

// Create the .env file
function createEnvFile() {
  rl.question(`Enter the path to your images folder [${defaultImagePath}]: `, (imagePath) => {
    const finalImagePath = imagePath || defaultImagePath;
    
    rl.question(`Enter the port number for the server [${defaultPort}]: `, (port) => {
      const finalPort = port || defaultPort;
      
      const envContent = `IMAGE_FOLDER_PATH=${finalImagePath}
PORT=${finalPort}`;
      
      fs.writeFileSync(path.join(__dirname, '.env'), envContent);
      console.log('.env file created successfully!');
      
      // Create test images directory if it doesn't exist
      if (finalImagePath === defaultImagePath) {
        const testDir = path.join(__dirname, 'images');
        if (!fs.existsSync(testDir)) {
          console.log('Creating test images directory...');
          fs.mkdirSync(testDir);
          
          // Create a few subdirectories for testing
          const categories = ['nature', 'animals', 'abstract'];
          categories.forEach(cat => {
            const catDir = path.join(testDir, cat);
            if (!fs.existsSync(catDir)) {
              fs.mkdirSync(catDir);
            }
            
            // Create dummy image files in each category
            for (let i = 1; i <= 3; i++) {
              const content = `Test image ${cat} ${i}`;
              fs.writeFileSync(path.join(catDir, `test${i}.jpg`), content);
            }
          });
          
          // Create some images in the root directory
          for (let i = 1; i <= 3; i++) {
            const content = `Test image root ${i}`;
            fs.writeFileSync(path.join(testDir, `test${i}.jpg`), content);
          }
          
          console.log(`Created test images in ${testDir}`);
        }
      }
      
      installDependencies();
    });
  });
}

// Install dependencies
function installDependencies() {
  console.log('Installing dependencies...');
  try {
    execSync('npm install express cors dotenv chokidar', { stdio: 'inherit' });
    console.log('Dependencies installed successfully!');
    
    console.log('\nSetup complete!');
    console.log('\nYou can now run one of the server versions:');
    console.log('  - Basic: node server.js');
    console.log('  - Optimized: node server-optimized.js');
    console.log('  - Advanced: node server-advanced.js');
    
    rl.close();
  } catch (error) {
    console.error('Error installing dependencies:', error.message);
    rl.close();
  }
} 