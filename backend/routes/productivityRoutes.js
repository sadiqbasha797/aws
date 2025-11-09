const express = require('express');
const {
  getAllProductivityData,
  getProductivityData,
  getMyProductivityData,
  createProductivityData,
  updateProductivityData,
  deleteProductivityData,
  getAggregatedTeamPerformance,
  getTopPerformers,
  getProductivityStats,
  getProductivityByWeek,
  getProductivityByMonth,
  getTeamMemberProductivityHistory,
  getPerformanceTrends,
  bulkCreateProductivityData
} = require('../controllers/productivityController');
const { protect, restrictTo, checkActive } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);
router.use(checkActive);

// Team member routes (read-only access to their own data)
router.get('/my-data', getMyProductivityData);

// Manager routes (full CRUD access)
router.use(restrictTo('manager'));

// Basic CRUD operations
router.get('/', getAllProductivityData);
router.get('/aggregated', getAggregatedTeamPerformance);
router.get('/stats', getProductivityStats);
router.get('/top-performers', getTopPerformers);
router.get('/trends', getPerformanceTrends);
router.get('/week/:year/:weekNumber', getProductivityByWeek);
router.get('/month/:year/:month', getProductivityByMonth);
router.get('/team-member/:associateName/history', getTeamMemberProductivityHistory);
router.get('/:id', getProductivityData);
router.post('/', createProductivityData);
router.post('/bulk', bulkCreateProductivityData);
router.patch('/:id', updateProductivityData);
router.delete('/:id', deleteProductivityData);

module.exports = router;
