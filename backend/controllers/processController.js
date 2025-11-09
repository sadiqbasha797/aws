const Process = require('../models/Process');

/**
 * Create a new Process
 */
const createProcess = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Process name is required'
      });
    }

    // Check if process with same name already exists
    const existingProcess = await Process.findOne({ name: name.trim() });
    if (existingProcess) {
      return res.status(400).json({
        status: 'error',
        message: 'Process with this name already exists'
      });
    }

    const process = await Process.create({ name: name.trim() });

    res.status(201).json({
      status: 'success',
      message: 'Process created successfully',
      data: {
        process
      }
    });
  } catch (error) {
    console.error('Error creating process:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create process',
      error: error.message
    });
  }
};

/**
 * Get all Processes
 */
const getAllProcesses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build search query
    const query = {};
    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    const processes = await Process.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Process.countDocuments(query);
    const pages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      status: 'success',
      results: processes.length,
      total,
      page: parseInt(page),
      pages,
      data: {
        processes
      }
    });
  } catch (error) {
    console.error('Error fetching processes:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch processes',
      error: error.message
    });
  }
};

/**
 * Get Process by ID
 */
const getProcessById = async (req, res) => {
  try {
    const { id } = req.params;

    const process = await Process.findById(id);

    if (!process) {
      return res.status(404).json({
        status: 'error',
        message: 'Process not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        process
      }
    });
  } catch (error) {
    console.error('Error fetching process:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch process',
      error: error.message
    });
  }
};

/**
 * Update Process
 */
const updateProcess = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Process name is required'
      });
    }

    // Check if another process with same name exists
    const existingProcess = await Process.findOne({ 
      name: name.trim(),
      _id: { $ne: id }
    });
    
    if (existingProcess) {
      return res.status(400).json({
        status: 'error',
        message: 'Process with this name already exists'
      });
    }

    const process = await Process.findByIdAndUpdate(
      id,
      { name: name.trim() },
      { new: true, runValidators: true }
    );

    if (!process) {
      return res.status(404).json({
        status: 'error',
        message: 'Process not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Process updated successfully',
      data: {
        process
      }
    });
  } catch (error) {
    console.error('Error updating process:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update process',
      error: error.message
    });
  }
};

/**
 * Delete Process
 */
const deleteProcess = async (req, res) => {
  try {
    const { id } = req.params;

    const process = await Process.findByIdAndDelete(id);

    if (!process) {
      return res.status(404).json({
        status: 'error',
        message: 'Process not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Process deleted successfully',
      data: {
        process
      }
    });
  } catch (error) {
    console.error('Error deleting process:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete process',
      error: error.message
    });
  }
};

module.exports = {
  createProcess,
  getAllProcesses,
  getProcessById,
  updateProcess,
  deleteProcess
};

