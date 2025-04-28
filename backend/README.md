# Random Image Server

This Express server provides a simple API to serve random images from a specified folder.

## Quick Setup

Run the setup script for an interactive setup process:

```
node setup.js
```

This will:
- Guide you through creating the `.env` file
- Install all required dependencies
- Create a test images directory (optional)

## Manual Setup

1. Install dependencies:
   ```
   npm install express cors dotenv chokidar
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```
   IMAGE_FOLDER_PATH=./path/to/your/images
   PORT=3000 (optional, defaults to 3000)
   ```

## Updating Dependencies

To update dependencies to their latest versions:

```
node update.js
```

## Features

- Efficiently serves random images from the specified folder
- Dynamically scans the directory (updates when images are added or removed)
- Automatically filters for image files (jpg, jpeg, png, gif, webp, bmp)
- Includes CORS support for cross-origin requests

## Server Versions

### Standard Server (server.js)

Basic implementation that periodically rescans the directory.

```
node server.js
```

### Optimized Server (server-optimized.js)

Enhanced version designed for directories with large numbers of images:
- Uses file system watchers for real-time updates
- More efficient handling of file selection
- Better error recovery
- Additional API endpoint for image collection info

```
node server-optimized.js
```

### Advanced Server (server-advanced.js)

Comprehensive solution for extremely large image collections:
- Recursive directory scanning (supports nested folders)
- Category-based organization (images grouped by subdirectory)
- Advanced caching and organization by categories
- Additional API endpoints for categories and manual rescanning
- Real-time file watching with debouncing for file operations

```
node server-advanced.js
```

## API Endpoints

### GET /api/random-image

Returns a random image from the specified folder.

**Advanced server parameters:**
- `category`: (optional) Specify a category (subdirectory) to get random images from only that category

### GET /api/images/info (Optimized & Advanced server only)

Returns information about the image collection.

### GET /api/images/categories (Advanced server only)

Returns a list of all available categories (subdirectories) and their image counts.

### POST /api/images/rescan (Advanced server only)

Forces a manual rescan of the image directory.

## Testing

Run the test script to verify the server is working correctly:

```
node test.js
```

This will create a test directory with sample images and test the API endpoint. 