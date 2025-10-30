const express = require('express');
const multer = require('multer');
const { 
  upload, 
  download, 
  deleteFileFromS3, 
  listAllFiles, 
  getFileUrl,
  checkFileExists 
} = require('../controllers/fileController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Configure multer to store files in memory
const storage = multer.memoryStorage();
const uploadMiddleware = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Upload a file (requires authentication)
router.post('/upload', protect, uploadMiddleware.single('file'), upload);

// Download a file (requires authentication)
router.get('/download/:key', protect, download);

// Delete a file (requires authentication)
router.delete('/delete/:key', protect, deleteFileFromS3);

// List all files (requires authentication)
router.get('/list', protect, listAllFiles);

// Get presigned URL for a file (requires authentication)
router.get('/url/:key', protect, getFileUrl);

// Check if file exists (requires authentication)
router.get('/exists/:key', protect, checkFileExists);

module.exports = router;

