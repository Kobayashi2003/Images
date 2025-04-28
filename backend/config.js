/**
 * Configuration file
 */
module.exports = {
  // Server configuration
  port: 5555,
  
  // Image folder path - modify to your image directory
  imageFolder: './images',
  
  // Supported image extensions
  supportedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
  
  // File watching options
  watchOptions: {
    ignored: /(^|[\/\\])\../, // Ignore dotfiles and directories starting with dot
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  }
}; 