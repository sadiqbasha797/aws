const express = require('express');
const {
  getAllReliabilityData,
  getReliabilityData,
  getMyReliabilityData,
  createReliabilityData,
  updateReliabilityData,
  deleteReliabilityData,
  getTopPerformers,
  getPerformanceStats,
  getUserPerformanceHistory,
  getPerformanceByPeriod
} = require('../controllers/reliabilityController');
const { protect, restrictTo, checkActive } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);
router.use(checkActive);

// User routes (read-only access to their own data)
router.get('/my-data', getMyReliabilityData);

// Manager routes (full CRUD access)
router.use(restrictTo('manager'));

// Basic CRUD operations
router.get('/', getAllReliabilityData);
router.get('/stats', getPerformanceStats);
router.get('/top-performers', getTopPerformers);
router.get('/period/:year/:month', getPerformanceByPeriod);
router.get('/user/:daId/history', getUserPerformanceHistory);
router.get('/:id', getReliabilityData);
router.post('/', createReliabilityData);
router.patch('/:id', updateReliabilityData);
router.delete('/:id', deleteReliabilityData);

module.exports = router;
