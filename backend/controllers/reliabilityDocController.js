const ReliabilityDoc = require('../models/ReliabilityDoc');
const { uploadFile, deleteFile } = require('../utils/s3');

// Get all reliability docs (Manager only)
const getAllReliabilityDocs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { isActive: true };
    
    // Filter by managerId
    if (req.userRole === 'manager') {
      filter.managerId = req.user.managerId || req.user._id.toString();
    }

    // Optional filters
    if (req.query.search) {
      filter.$or = [
        { 'document.originalName': { $regex: req.query.search, $options: 'i' } },
        { processname: { $regex: req.query.search, $options: 'i' } },
        { job_id: { $regex: req.query.search, $options: 'i' } },
        { createdBy: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    if (req.query.processname) {
      filter.processname = { $regex: req.query.processname, $options: 'i' };
    }

    if (req.query.job_id) {
      filter.job_id = req.query.job_id;
    }

    if (req.query.year) {
      filter.year = parseInt(req.query.year);
    }

    if (req.query.month) {
      filter.month = parseInt(req.query.month);
    }

    const reliabilityDocs = await ReliabilityDoc.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ReliabilityDoc.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: reliabilityDocs.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        reliabilityDocs
      }
    });
  } catch (error) {
    console.error('Error getting reliability docs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get reliability doc by ID
const getReliabilityDoc = async (req, res) => {
  try {
    const reliabilityDoc = await ReliabilityDoc.findById(req.params.id);

    if (!reliabilityDoc) {
      return res.status(404).json({
        status: 'error',
        message: 'Reliability document not found'
      });
    }

    // Check access permissions
    if (req.userRole === 'manager') {
      // Manager can only access their own reliability docs
      if (reliabilityDoc.managerId !== (req.user.managerId || req.user._id.toString())) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You can only view your own reliability documents.'
        });
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        reliabilityDoc
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Create reliability doc (Manager only)
const createReliabilityDoc = async (req, res) => {
  try {
    const { processname, job_id, year, month } = req.body;

    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Document file is required'
      });
    }

    const managerId = req.user.managerId || req.user._id.toString();
    const createdBy = req.user.name || req.user.email || 'Manager';

    // Upload file to S3
    const file = req.file;
    const key = `reliability-docs/${Date.now()}-${file.originalname}`;
    const uploadResult = await uploadFile(key, file.buffer, file.mimetype);

    const reliabilityDocData = {
      document: {
        filename: file.originalname,
        originalName: file.originalname,
        s3Key: uploadResult.key,
        s3Url: uploadResult.location,
        fileSize: file.size,
        mimeType: file.mimetype
      },
      createdBy,
      managerId
    };

    if (processname) {
      reliabilityDocData.processname = processname;
    }

    if (job_id) {
      reliabilityDocData.job_id = job_id;
    }

    if (year) {
      reliabilityDocData.year = parseInt(year);
    }

    if (month) {
      reliabilityDocData.month = parseInt(month);
    }

    const reliabilityDoc = await ReliabilityDoc.create(reliabilityDocData);

    res.status(201).json({
      status: 'success',
      message: 'Reliability document created successfully',
      data: {
        reliabilityDoc
      }
    });
  } catch (error) {
    console.error('Error creating reliability doc:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update reliability doc (Manager only)
const updateReliabilityDoc = async (req, res) => {
  try {
    const { processname, job_id, year, month } = req.body;

    const reliabilityDoc = await ReliabilityDoc.findById(req.params.id);

    if (!reliabilityDoc) {
      return res.status(404).json({
        status: 'error',
        message: 'Reliability document not found'
      });
    }

    // Check access permissions
    if (reliabilityDoc.managerId !== (req.user.managerId || req.user._id.toString())) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only update your own reliability documents.'
      });
    }

    const updateData = {};
    
    // If a new file is uploaded, replace the old one
    if (req.file) {
      // Delete old file from S3
      try {
        await deleteFile(reliabilityDoc.document.s3Key);
      } catch (error) {
        console.error('Error deleting old file:', error);
        // Continue even if deletion fails
      }

      // Upload new file to S3
      const file = req.file;
      const key = `reliability-docs/${Date.now()}-${file.originalname}`;
      const uploadResult = await uploadFile(key, file.buffer, file.mimetype);

      updateData.document = {
        filename: file.originalname,
        originalName: file.originalname,
        s3Key: uploadResult.key,
        s3Url: uploadResult.location,
        fileSize: file.size,
        mimeType: file.mimetype
      };
    }

    if (processname !== undefined) {
      updateData.processname = processname;
    }

    if (job_id !== undefined) {
      updateData.job_id = job_id;
    }

    if (year !== undefined) {
      updateData.year = parseInt(year);
    }

    if (month !== undefined) {
      updateData.month = parseInt(month);
    }

    const updatedReliabilityDoc = await ReliabilityDoc.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      status: 'success',
      message: 'Reliability document updated successfully',
      data: {
        reliabilityDoc: updatedReliabilityDoc
      }
    });
  } catch (error) {
    console.error('Error updating reliability doc:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete reliability doc (Manager only)
const deleteReliabilityDoc = async (req, res) => {
  try {
    const reliabilityDoc = await ReliabilityDoc.findById(req.params.id);

    if (!reliabilityDoc) {
      return res.status(404).json({
        status: 'error',
        message: 'Reliability document not found'
      });
    }

    // Check access permissions
    if (reliabilityDoc.managerId !== (req.user.managerId || req.user._id.toString())) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only delete your own reliability documents.'
      });
    }

    // Delete file from S3
    try {
      await deleteFile(reliabilityDoc.document.s3Key);
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      // Continue with soft delete even if S3 deletion fails
    }

    // Soft delete
    reliabilityDoc.isActive = false;
    await reliabilityDoc.save();

    res.status(200).json({
      status: 'success',
      message: 'Reliability document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting reliability doc:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

module.exports = {
  getAllReliabilityDocs,
  getReliabilityDoc,
  createReliabilityDoc,
  updateReliabilityDoc,
  deleteReliabilityDoc
};

