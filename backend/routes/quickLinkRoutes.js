const express = require('express');
const {
  createQuickLink,
  getAllQuickLinks,
  getQuickLinkById,
  updateQuickLink,
  deleteQuickLink,
  getMyQuickLinks
} = require('../controllers/quickLinkController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/quick-links - Get all Quick Links with filtering and pagination
router.get('/', getAllQuickLinks);

// GET /api/quick-links/my - Get current user's Quick Links
router.get('/my', getMyQuickLinks);

// GET /api/quick-links/:id - Get Quick Link by ID
router.get('/:id', getQuickLinkById);

// POST /api/quick-links - Create new Quick Link
router.post('/', createQuickLink);

// PUT /api/quick-links/:id - Update Quick Link
router.put('/:id', updateQuickLink);

// DELETE /api/quick-links/:id - Delete Quick Link
router.delete('/:id', deleteQuickLink);

module.exports = router;

