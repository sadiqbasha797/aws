const express = require('express');
const multer = require('multer');
const {
  getAllAuditDocs,
  getAuditDoc,
  createAuditDoc,
  updateAuditDoc,
  deleteAuditDoc
} = require('../controllers/auditDocController');
const { protect, restrictTo, checkActive } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
  }
});

// All routes require authentication and manager role
router.use(protect);
router.use(checkActive);
router.use(restrictTo('manager'));

// CRUD operations
router.get('/', getAllAuditDocs);
router.get('/:id', getAuditDoc);
router.post('/', upload.single('document'), createAuditDoc);
router.patch('/:id', upload.single('document'), updateAuditDoc);
router.delete('/:id', deleteAuditDoc);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File too large',
        details: 'File size cannot exceed 10MB'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        status: 'error',
        message: 'Unexpected field',
        details: 'Use "document" field for file uploads'
      });
    }
  }
  
  if (error.message && error.message.includes('File type') && error.message.includes('is not allowed')) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid file type',
      details: error.message
    });
  }

  next(error);
});

module.exports = router;

