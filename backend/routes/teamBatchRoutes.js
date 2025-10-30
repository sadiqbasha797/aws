const express = require('express');
const multer = require('multer');
const {
  createTeamBatch,
  getAllTeamBatches,
  getTeamBatchById,
  updateTeamBatch,
  deleteTeamBatch,
  uploadBatchImage,
  removeBatchImage,
  addMemberToBatch,
  removeMemberFromBatch,
  getMyBatches,
  getActiveBatches,
  getBatchStatistics
} = require('../controllers/teamBatchController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  },
  fileFilter: (req, file, cb) => {
    // Allow only image types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed. Only image files are permitted.`), false);
    }
  }
});

// All routes require authentication
router.use(protect);

// GET /api/team-batches - Get all team batches with filtering and pagination
router.get('/', getAllTeamBatches);

// GET /api/team-batches/my - Get current manager's batches
router.get('/my', getMyBatches);

// GET /api/team-batches/active - Get all active batches
router.get('/active', getActiveBatches);

// GET /api/team-batches/statistics - Get batch statistics
router.get('/statistics', getBatchStatistics);

// GET /api/team-batches/:id - Get team batch by ID
router.get('/:id', getTeamBatchById);

// POST /api/team-batches - Create new team batch (with optional image upload)
router.post('/', upload.single('batchImage'), createTeamBatch);

// PATCH /api/team-batches/:id - Update team batch (without image)
router.patch('/:id', updateTeamBatch);

// DELETE /api/team-batches/:id - Delete team batch and associated image
router.delete('/:id', deleteTeamBatch);

// POST /api/team-batches/:id/image - Upload or update batch image
router.post('/:id/image', upload.single('batchImage'), uploadBatchImage);

// DELETE /api/team-batches/:id/image - Remove batch image
router.delete('/:id/image', removeBatchImage);

// POST /api/team-batches/:id/members - Add member to batch
router.post('/:id/members', addMemberToBatch);

// DELETE /api/team-batches/:id/members/:memberId - Remove member from batch
router.delete('/:id/members/:memberId', removeMemberFromBatch);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        details: 'Image size cannot exceed 5MB'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected field',
        details: 'Use "batchImage" field for image uploads'
      });
    }
  }
  
  if (error.message.includes('File type') && error.message.includes('is not allowed')) {
    return res.status(400).json({
      error: 'Invalid file type',
      details: error.message
    });
  }

  next(error);
});

module.exports = router;
