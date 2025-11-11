const express = require('express');
const {
  getActiveManagersForSignup,
  getAllManagers,
  getManager,
  getMe,
  createManager,
  updateManager,
  updateMe,
  deleteManager,
  deactivateManager,
  activateManager,
  getManagerTeamMembers,
  getManagerStats,
  getManagerSpecificStats
} = require('../controllers/managerController');
const { protect, restrictTo, checkActive } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/public/active', getActiveManagersForSignup);

// Protected routes
router.use(protect); // All routes below this middleware are protected

// Manager profile routes
router.get('/me', getMe);
router.patch('/me', updateMe);

// Manager management routes (require authentication)
router.get('/', getAllManagers);
router.get('/stats', getManagerStats);
router.get('/:id', getManager);
router.post('/', createManager);
router.patch('/:id', updateManager);
router.delete('/:id', deleteManager);

// Manager status management routes
router.patch('/:id/deactivate', deactivateManager);
router.patch('/:id/activate', activateManager);

// Manager-specific team member management
router.get('/:managerId/team-members', getManagerTeamMembers);
router.get('/:managerId/stats', getManagerSpecificStats);

module.exports = router;
