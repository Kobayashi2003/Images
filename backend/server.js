const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const cors = require('cors');
const chokidar = require('chokidar');
const config = require('./config');

// Initialize Express application
const app = express();
app.use(cors());

// Cache to store image files list
let imageFiles = [];

// Set of image extensions for quick checking
const IMAGE_EXTENSIONS = new Set(config.supportedExtensions);

/**
 * Check if a file is an image
 */
function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

/**
 * Initialize image file watcher
 */
async function initializeImageWatcher() {
  try {
    // Check if directory exists
    try {
      await fs.access(config.imageFolder);
    } catch (err) {
      console.error(`Image directory ${config.imageFolder} does not exist, attempting to create`);
      fsSync.mkdirSync(config.imageFolder, { recursive: true });
    }
    
    // Initial scan
    console.log(`Scanning directory: ${config.imageFolder}`);
    const files = await fs.readdir(config.imageFolder);
    imageFiles = files.filter(isImageFile);
    console.log(`Initial scan complete, found ${imageFiles.length} images`);
    
    // Set up file watcher
    const watcher = chokidar.watch(config.imageFolder, config.watchOptions);
    
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
    
    console.log(`Now watching for changes in ${config.imageFolder}`);
  } catch (error) {
    console.error('Error initializing image watcher:', error);
  }
}

/**
 * API: Get a random image
 */
app.get('/api/random-image', async (req, res) => {
  if (imageFiles.length === 0) {
    return res.status(404).json({ 
      error: 'No images found in the specified directory' 
    });
  }
  
  // Select a random image
  const randomIndex = Math.floor(Math.random() * imageFiles.length);
  const randomImage = imageFiles[randomIndex];
  const imagePath = path.join(config.imageFolder, randomImage);
  
  try {
    // Check if file exists
    await fs.access(imagePath);
    
    // Send the image
    res.sendFile(path.resolve(imagePath), err => {
      if (err) {
        console.error('Failed to send image:', err);
        res.status(500).json({ error: 'Failed to send image' });
      }
    });
  } catch (error) {
    // File doesn't exist, remove from list
    const index = imageFiles.indexOf(randomImage);
    if (index !== -1) {
      imageFiles.splice(index, 1);
      console.log(`Removed non-existent file from cache: ${randomImage}`);
    }
    
    // If there are still images in the list, try another one
    if (imageFiles.length > 0) {
      const newRandomIndex = Math.floor(Math.random() * imageFiles.length);
      const newRandomImage = imageFiles[newRandomIndex];
      const newImagePath = path.join(config.imageFolder, newRandomImage);
      
      res.sendFile(path.resolve(newImagePath), err => {
        if (err) {
          console.error('Failed to send image on retry:', err);
          res.status(500).json({ error: 'Failed to send image' });
        }
      });
    } else {
      res.status(404).json({ error: 'No valid image files in the directory' });
    }
  }
});

app.listen(config.port, async () => {
  console.log(`Server started on port ${config.port}`);
  await initializeImageWatcher();
}); 