const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const cors = require('cors');
const chokidar = require('chokidar');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Cache system
let imageFiles = [];
let imagesByCategory = new Map();
let imageStats = { total: 0, lastUpdated: null };
let watcher = null;

// Use chunked reading for extremely large directories
const CHUNK_SIZE = 1000; // How many files to process at once

// Supported image extensions
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']);

// Function to check if a file is an image
function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

// Recursively scan a directory for images
async function scanDirectory(dir, baseDir = null) {
  if (!baseDir) baseDir = dir;
  
  let results = [];
  let subdirs = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    // Process files and collect directories
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      
      if (entry.isDirectory()) {
        subdirs.push(fullPath);
      } else if (entry.isFile() && isImageFile(entry.name)) {
        results.push(relativePath);
      }
    }
    
    // Process subdirectories
    for (const subdir of subdirs) {
      const subdirResults = await scanDirectory(subdir, baseDir);
      results = results.concat(subdirResults);
    }
    
    return results;
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
    return results;
  }
}

// Initialize the image collection with chunked reading
async function initializeImageCollection() {
  const imageFolder = process.env.IMAGE_FOLDER_PATH;
  if (!imageFolder) {
    console.error('IMAGE_FOLDER_PATH not set in .env file');
    return;
  }

  try {
    // Check if directory exists
    await fs.access(imageFolder);
    
    console.log(`Scanning directory: ${imageFolder}`);
    const startTime = Date.now();
    
    // Scan for all images
    const allImages = await scanDirectory(imageFolder);
    
    // Process images and organize by directory (category)
    imageFiles = allImages;
    imagesByCategory.clear();
    
    // Group images by their parent directory
    for (const img of allImages) {
      const dirName = path.dirname(img);
      const category = dirName === '.' ? 'root' : dirName;
      
      if (!imagesByCategory.has(category)) {
        imagesByCategory.set(category, []);
      }
      imagesByCategory.get(category).push(img);
    }
    
    imageStats = {
      total: allImages.length,
      lastUpdated: new Date(),
      scanTime: Date.now() - startTime,
      categories: Array.from(imagesByCategory.keys()).map(cat => ({
        name: cat,
        count: imagesByCategory.get(cat).length
      }))
    };
    
    console.log(`Scan complete. Found ${allImages.length} images in ${imageStats.scanTime}ms`);
    
    // Set up watcher for real-time directory changes
    setupWatcher(imageFolder);
  } catch (error) {
    console.error('Error initializing image collection:', error);
  }
}

// Set up file watcher for directory changes
function setupWatcher(directory) {
  if (watcher) {
    watcher.close();
  }
  
  watcher = chokidar.watch(directory, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });
  
  watcher
    .on('add', filePath => {
      const relativePath = path.relative(directory, filePath);
      if (isImageFile(filePath) && !imageFiles.includes(relativePath)) {
        // Add to main list
        imageFiles.push(relativePath);
        
        // Add to category map
        const dirName = path.dirname(relativePath);
        const category = dirName === '.' ? 'root' : dirName;
        if (!imagesByCategory.has(category)) {
          imagesByCategory.set(category, []);
        }
        imagesByCategory.get(category).push(relativePath);
        
        // Update stats
        imageStats.total++;
        imageStats.lastUpdated = new Date();
        
        console.log(`New image added: ${relativePath}`);
      }
    })
    .on('unlink', filePath => {
      const relativePath = path.relative(directory, filePath);
      const index = imageFiles.indexOf(relativePath);
      
      if (index !== -1) {
        // Remove from main list
        imageFiles.splice(index, 1);
        
        // Remove from category map
        const dirName = path.dirname(relativePath);
        const category = dirName === '.' ? 'root' : dirName;
        
        if (imagesByCategory.has(category)) {
          const catIndex = imagesByCategory.get(category).indexOf(relativePath);
          if (catIndex !== -1) {
            imagesByCategory.get(category).splice(catIndex, 1);
            
            // Remove category if empty
            if (imagesByCategory.get(category).length === 0) {
              imagesByCategory.delete(category);
            }
          }
        }
        
        // Update stats
        imageStats.total--;
        imageStats.lastUpdated = new Date();
        
        console.log(`Image removed: ${relativePath}`);
      }
    })
    .on('error', error => console.error(`Watcher error: ${error}`));
  
  console.log(`Watching for changes in ${directory}`);
}

// Get a random image from a specific category or from all images
function getRandomImage(category = null) {
  if (category && imagesByCategory.has(category)) {
    const categoryImages = imagesByCategory.get(category);
    if (categoryImages.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * categoryImages.length);
    return categoryImages[randomIndex];
  } else {
    if (imageFiles.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * imageFiles.length);
    return imageFiles[randomIndex];
  }
}

// API endpoint to get a random image
app.get('/api/random-image', async (req, res) => {
  const imageFolder = process.env.IMAGE_FOLDER_PATH;
  const category = req.query.category || null;
  
  if (!imageFolder) {
    return res.status(500).json({ error: 'IMAGE_FOLDER_PATH not set in .env file' });
  }
  
  if (imageFiles.length === 0) {
    return res.status(404).json({ error: 'No images found in the specified directory' });
  }
  
  // Get a random image
  const randomImage = getRandomImage(category);
  if (!randomImage) {
    return res.status(404).json({ 
      error: category ? `No images found in category '${category}'` : 'Failed to select a random image' 
    });
  }
  
  const imagePath = path.join(imageFolder, randomImage);
  
  try {
    // Check if the file still exists
    await fs.access(imagePath);
    
    // Send the image
    res.sendFile(path.resolve(imagePath), (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ error: 'Failed to send image' });
      }
    });
  } catch (error) {
    // Image doesn't exist anymore, try again with another random image
    console.log(`File not found: ${imagePath}, retrying with another random image`);
    
    // Remove the missing file from our lists
    const mainIndex = imageFiles.indexOf(randomImage);
    if (mainIndex !== -1) {
      imageFiles.splice(mainIndex, 1);
      
      const dirName = path.dirname(randomImage);
      const imgCategory = dirName === '.' ? 'root' : dirName;
      
      if (imagesByCategory.has(imgCategory)) {
        const catIndex = imagesByCategory.get(imgCategory).indexOf(randomImage);
        if (catIndex !== -1) {
          imagesByCategory.get(imgCategory).splice(catIndex, 1);
          
          if (imagesByCategory.get(imgCategory).length === 0) {
            imagesByCategory.delete(imgCategory);
          }
        }
      }
      
      imageStats.total--;
      imageStats.lastUpdated = new Date();
    }
    
    if (imageFiles.length > 0) {
      // Try again with a different image
      const newRandomImage = getRandomImage(category);
      if (newRandomImage) {
        const newImagePath = path.join(imageFolder, newRandomImage);
        res.sendFile(path.resolve(newImagePath), (err) => {
          if (err) {
            console.error('Error sending file on retry:', err);
            res.status(500).json({ error: 'Failed to send image' });
          }
        });
      } else {
        res.status(404).json({ error: 'No valid images found' });
      }
    } else {
      res.status(404).json({ error: 'No valid images found in the directory' });
    }
  }
});

// API endpoint to get image collection info
app.get('/api/images/info', (req, res) => {
  res.json({
    totalImages: imageStats.total,
    lastUpdated: imageStats.lastUpdated,
    categories: Array.from(imagesByCategory.keys()).map(cat => ({
      name: cat,
      count: imagesByCategory.get(cat).length
    })),
    imageFolder: process.env.IMAGE_FOLDER_PATH
  });
});

// API endpoint to get all available categories
app.get('/api/images/categories', (req, res) => {
  res.json({
    categories: Array.from(imagesByCategory.keys()).map(cat => ({
      name: cat,
      count: imagesByCategory.get(cat).length
    }))
  });
});

// Force a rescan of the directory
app.post('/api/images/rescan', async (req, res) => {
  try {
    console.log('Initiating manual rescan...');
    await initializeImageCollection();
    res.json({
      success: true,
      stats: imageStats
    });
  } catch (error) {
    console.error('Error during manual rescan:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeImageCollection();
}); 