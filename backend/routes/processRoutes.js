const express = require('express');
const {
  createProcess,
  getAllProcesses,
  getProcessById,
  updateProcess,
  deleteProcess
} = require('../controllers/processController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and manager role
router.use(protect);
router.use(restrictTo('manager'));

// GET /api/processes - Get all processes with filtering and pagination
router.get('/', getAllProcesses);

// GET /api/processes/:id - Get process by ID
router.get('/:id', getProcessById);

// POST /api/processes - Create new process
router.post('/', createProcess);

// PUT /api/processes/:id - Update process
router.put('/:id', updateProcess);

// DELETE /api/processes/:id - Delete process
router.delete('/:id', deleteProcess);

module.exports = router;

