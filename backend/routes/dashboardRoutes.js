const express = require('express');
const { getDashboardStats, getRecentActivities, getReliabilityMonthlyData, getProductivityWeeklyData } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', getDashboardStats);

// GET /api/dashboard/activities - Get recent activities
router.get('/activities', getRecentActivities);

// GET /api/dashboard/reliability/monthly - Get month-wise reliability data (last 5 months)
router.get('/reliability/monthly', getReliabilityMonthlyData);

// GET /api/dashboard/productivity/weekly - Get week-wise productivity data (last 5 weeks)
router.get('/productivity/weekly', getProductivityWeeklyData);

module.exports = router;

