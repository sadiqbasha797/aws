const express = require('express');
const {
  getAllTeamMembers,
  getTeamMember,
  getMe,
  createTeamMember,
  updateTeamMember,
  updateMe,
  deleteTeamMember,
  deactivateTeamMember,
  activateTeamMember,
  getTeamMembersByManager,
  getTeamMemberStats
} = require('../controllers/teamMemberController');
const { protect, restrictTo, checkActive } = require('../middleware/auth');

const router = express.Router();

// Public routes (if any)
// None for now

// Protected routes
router.use(protect); // All routes below this middleware are protected

// Team member profile routes
router.get('/me', getMe);
router.patch('/me', updateMe);

// Team member management routes (require authentication)
router.get('/', getAllTeamMembers);
router.get('/stats', getTeamMemberStats);
router.get('/manager/:managerId', getTeamMembersByManager);
router.get('/:id', getTeamMember);
router.post('/', createTeamMember);
router.patch('/:id', updateTeamMember);
router.delete('/:id', deleteTeamMember);

// Team member status management routes
router.patch('/:id/deactivate', deactivateTeamMember);
router.patch('/:id/activate', activateTeamMember);

module.exports = router;
