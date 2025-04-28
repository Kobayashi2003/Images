/**
 * Test script to verify the random image server functionality
 * Run this after starting the server to test it
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Create test directory and sample images if they don't exist
const testDir = path.join(__dirname, 'test-images');
if (!fs.existsSync(testDir)) {
  console.log('Creating test directory...');
  fs.mkdirSync(testDir);
  
  // Create a few dummy image files for testing
  for (let i = 1; i <= 5; i++) {
    const content = `Test image ${i}`;
    fs.writeFileSync(path.join(testDir, `test${i}.jpg`), content);
  }
  
  console.log(`Created test directory with 5 sample images at: ${testDir}`);
  console.log('Before running the test, update your .env file to point to this directory:');
  console.log(`IMAGE_FOLDER_PATH=${testDir}`);
}

// Test the API endpoint
function testRandomImage() {
  console.log('Testing /api/random-image endpoint...');
  
  // Make 5 requests to ensure we're getting different images
  const requests = [];
  for (let i = 0; i < 5; i++) {
    requests.push(new Promise((resolve) => {
      const req = http.get('http://localhost:3000/api/random-image', (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const statusCode = res.statusCode;
          const contentType = res.headers['content-type'] || '';
          
          resolve({
            statusCode,
            contentType,
            dataLength: data.length,
            isImage: contentType.startsWith('image/')
          });
        });
      });
      
      req.on('error', (error) => {
        resolve({
          error: error.message,
          isImage: false
        });
      });
    }));
  }
  
  Promise.all(requests).then(results => {
    console.log('\nTest Results:');
    results.forEach((result, index) => {
      console.log(`Request ${index + 1}:`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
        console.log('  Make sure the server is running on port 3000');
      } else {
        console.log(`  Status: ${result.statusCode}`);
        console.log(`  Content-Type: ${result.contentType}`);
        console.log(`  Data length: ${result.dataLength} bytes`);
        console.log(`  Is image: ${result.isImage}`);
      }
    });
    
    // Check if results vary (indicating randomness)
    const uniqueResults = new Set(results.map(r => r.dataLength));
    console.log(`\nUnique responses: ${uniqueResults.size} out of 5 requests`);
    if (uniqueResults.size > 1) {
      console.log('✅ Test passed: Server appears to be returning different images randomly');
    } else if (results[0].isImage) {
      console.log('⚠️ Test warning: Server is returning images, but possibly the same one each time');
    } else {
      console.log('❌ Test failed: Server is not returning proper images');
    }
  });
}

// Run the test
testRandomImage(); 