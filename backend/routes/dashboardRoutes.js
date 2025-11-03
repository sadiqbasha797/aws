const express = require('express');
const { getDashboardStats, getRecentActivities } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', getDashboardStats);

// GET /api/dashboard/activities - Get recent activities
router.get('/activities', getRecentActivities);

module.exports = router;

