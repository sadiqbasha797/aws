const express = require('express');
const multer = require('multer');
const {
  getAllReliabilityDocs,
  getReliabilityDoc,
  createReliabilityDoc,
  updateReliabilityDoc,
  deleteReliabilityDoc
} = require('../controllers/reliabilityDocController');
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
    // Allow Excel and CSV files
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12',
      'text/csv',
      'application/csv'
    ];

    // Also check file extension as fallback
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed. Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed.`), false);
    }
  }
});

// All routes require authentication and manager role
router.use(protect);
router.use(checkActive);
router.use(restrictTo('manager'));

// CRUD operations
router.get('/', getAllReliabilityDocs);
router.get('/:id', getReliabilityDoc);
router.post('/', upload.single('document'), createReliabilityDoc);
router.patch('/:id', upload.single('document'), updateReliabilityDoc);
router.delete('/:id', deleteReliabilityDoc);

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

