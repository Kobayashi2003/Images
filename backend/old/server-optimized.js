const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const chokidar = require('chokidar');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Cache to store file list
let imageFiles = [];
let watcher = null;

// Supported image extensions
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']);

// Function to check if a file is an image
function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

// Initialize the file watcher
async function initializeWatcher() {
  const imageFolder = process.env.IMAGE_FOLDER_PATH;
  if (!imageFolder) {
    console.error('IMAGE_FOLDER_PATH not set in .env file');
    return;
  }

  try {
    // Check if directory exists
    await fs.access(imageFolder);
    
    // Initial scan
    console.log(`Scanning directory: ${imageFolder}`);
    const files = await fs.readdir(imageFolder);
    imageFiles = files.filter(isImageFile);
    console.log(`Initial scan complete. Found ${imageFiles.length} images.`);
    
    // Set up watcher for directory changes
    watcher = chokidar.watch(imageFolder, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });
    
    watcher
      .on('add', filePath => {
        const filename = path.basename(filePath);
        if (isImageFile(filename) && !imageFiles.includes(filename)) {
          imageFiles.push(filename);
          console.log(`New image added: ${filename}`);
        }
      })
      .on('unlink', filePath => {
        const filename = path.basename(filePath);
        const index = imageFiles.indexOf(filename);
        if (index !== -1) {
          imageFiles.splice(index, 1);
          console.log(`Image removed: ${filename}`);
        }
      })
      .on('error', error => console.error(`Watcher error: ${error}`));
    
    console.log(`Watching for changes in ${imageFolder}`);
  } catch (error) {
    console.error('Error initializing directory watcher:', error);
  }
}

// Reservoir sampling algorithm for efficiently selecting a random item
// This is especially efficient for very large collections
function getRandomImage() {
  if (imageFiles.length === 0) return null;
  
  // Simple case: just pick a random index
  const randomIndex = Math.floor(Math.random() * imageFiles.length);
  return imageFiles[randomIndex];
}

// Endpoint to get a random image
app.get('/api/random-image', async (req, res) => {
  const imageFolder = process.env.IMAGE_FOLDER_PATH;
  
  if (!imageFolder) {
    return res.status(500).json({ error: 'IMAGE_FOLDER_PATH not set in .env file' });
  }
  
  if (imageFiles.length === 0) {
    return res.status(404).json({ error: 'No images found in the specified directory' });
  }
  
  // Get a random image
  const randomImage = getRandomImage();
  if (!randomImage) {
    return res.status(404).json({ error: 'Failed to select a random image' });
  }
  
  const imagePath = path.join(imageFolder, randomImage);
  
  try {
    // Check if the file still exists (could have been deleted after our last update)
    await fs.access(imagePath);
    
    // Send the image
    res.sendFile(path.resolve(imagePath), (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ error: 'Failed to send image' });
      }
    });
  } catch (error) {
    // File doesn't exist, remove it from our list and try again
    const index = imageFiles.indexOf(randomImage);
    if (index !== -1) {
      imageFiles.splice(index, 1);
      console.log(`Removed missing file from cache: ${randomImage}`);
    }
    
    // Try again with the updated list
    if (imageFiles.length > 0) {
      const newRandomImage = getRandomImage();
      const newImagePath = path.join(imageFolder, newRandomImage);
      
      res.sendFile(path.resolve(newImagePath), (err) => {
        if (err) {
          console.error('Error sending file on retry:', err);
          res.status(500).json({ error: 'Failed to send image' });
        }
      });
    } else {
      res.status(404).json({ error: 'No valid images found in the directory' });
    }
  }
});

// Endpoint to get information about the image collection
app.get('/api/images/info', (req, res) => {
  res.json({
    totalImages: imageFiles.length,
    imageFolder: process.env.IMAGE_FOLDER_PATH
  });
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeWatcher();
}); 