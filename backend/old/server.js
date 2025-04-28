const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Cache to store file list
let imageFiles = [];
let lastScanTime = 0;
const SCAN_INTERVAL = 30000; // Rescan every 30 seconds if requested

// Function to scan the image directory
function scanImageDirectory() {
  const imageFolder = process.env.IMAGE_FOLDER_PATH;
  if (!imageFolder) {
    console.error('IMAGE_FOLDER_PATH not set in .env file');
    return [];
  }
  
  try {
    // Check if directory exists
    if (!fs.existsSync(imageFolder)) {
      console.error(`Directory ${imageFolder} does not exist`);
      return [];
    }
    
    // Read all files in the directory
    const files = fs.readdirSync(imageFolder);
    
    // Filter for image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const images = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });
    
    console.log(`Scanned directory. Found ${images.length} images.`);
    return images;
  } catch (error) {
    console.error('Error scanning image directory:', error);
    return [];
  }
}

// Endpoint to get a random image
app.get('/api/random-image', (req, res) => {
  const currentTime = Date.now();
  
  // Rescan directory if it's been too long since the last scan
  if (currentTime - lastScanTime > SCAN_INTERVAL || imageFiles.length === 0) {
    imageFiles = scanImageDirectory();
    lastScanTime = currentTime;
  }
  
  if (imageFiles.length === 0) {
    return res.status(404).json({ error: 'No images found in the specified directory' });
  }
  
  // Select a random image
  const randomIndex = Math.floor(Math.random() * imageFiles.length);
  const randomImage = imageFiles[randomIndex];
  
  const imageFolder = process.env.IMAGE_FOLDER_PATH;
  const imagePath = path.join(imageFolder, randomImage);
  
  // Send the image
  res.sendFile(path.resolve(imagePath), (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(500).json({ error: 'Failed to send image' });
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Initial scan of the directory
  imageFiles = scanImageDirectory();
  lastScanTime = Date.now();
}); 