const express = require('express');
const {
  getAllUsers,
  getUser,
  getMe,
  createUser,
  updateUser,
  updateMe,
  deleteUser,
  deactivateUser,
  activateUser,
  getUsersByManager,
  getUserStats
} = require('../controllers/userController');
const { protect, restrictTo, checkActive } = require('../middleware/auth');

const router = express.Router();

// Public routes (if any)
// None for now

// Protected routes
router.use(protect); // All routes below this middleware are protected

// User profile routes
router.get('/me', getMe);
router.patch('/me', updateMe);

// User management routes (require authentication)
router.get('/', getAllUsers);
router.get('/stats', getUserStats);
router.get('/manager/:managerId', getUsersByManager);
router.get('/:id', getUser);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);

// User status management routes
router.patch('/:id/deactivate', deactivateUser);
router.patch('/:id/activate', activateUser);

module.exports = router;
