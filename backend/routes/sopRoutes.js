const express = require('express');
const multer = require('multer');
const {
  createSOP,
  getAllSOPs,
  getSOPById,
  updateSOP,
  deleteSOP,
  addDocuments,
  removeDocument,
  getMySOPs,
  getActiveSOPs,
  softDeleteSOP,
  // Bin methods
  getBinItems,
  restoreFromBin
} = require('../controllers/sopController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 5 // Maximum 5 files per upload
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

// All routes require authentication
router.use(protect);

// GET /api/sops - Get all SOPs with filtering and pagination
router.get('/', getAllSOPs);

// GET /api/sops/my - Get current user's SOPs
router.get('/my', getMySOPs);

// GET /api/sops/active - Get all active SOPs
router.get('/active', getActiveSOPs);

// GET /api/sops/:id - Get SOP by ID
router.get('/:id', getSOPById);

// POST /api/sops - Create new SOP (with optional file uploads)
router.post('/', upload.array('documents', 5), createSOP);

// PUT /api/sops/:id - Update SOP (without files)
router.put('/:id', updateSOP);

// DELETE /api/sops/:id - Delete SOP and all associated documents
router.delete('/:id', deleteSOP);

// POST /api/sops/:id/documents - Add documents to existing SOP
router.post('/:id/documents', upload.array('documents', 5), addDocuments);

// DELETE /api/sops/:id/documents/:documentId - Remove specific document from SOP
router.delete('/:id/documents/:documentId', removeDocument);

// DELETE /api/sops/:id/soft - Soft delete SOP (move to bin)
router.delete('/:id/soft', softDeleteSOP);

// Bin routes
// GET /api/sops/bin/items - Get user's bin items
router.get('/bin/items', getBinItems);

// POST /api/sops/bin/:binId/restore - Restore item from bin
router.post('/bin/:binId/restore', restoreFromBin);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        details: 'File size cannot exceed 10MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        details: 'Maximum 5 files allowed per upload'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected field',
        details: 'Use "documents" field for file uploads'
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
