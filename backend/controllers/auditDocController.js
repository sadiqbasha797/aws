const AuditDoc = require('../models/AuditDoc');
const { uploadFile, deleteFile } = require('../utils/s3');

// Get all audit docs (Manager only)
const getAllAuditDocs = async (req, res) => {
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
        { createdBy: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    if (req.query.dateFrom) {
      filter.date = { ...filter.date, $gte: new Date(req.query.dateFrom) };
    }

    if (req.query.dateTo) {
      filter.date = { 
        ...filter.date, 
        $lte: new Date(req.query.dateTo) 
      };
    }

    const auditDocs = await AuditDoc.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditDoc.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: auditDocs.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        auditDocs
      }
    });
  } catch (error) {
    console.error('Error getting audit docs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get audit doc by ID
const getAuditDoc = async (req, res) => {
  try {
    const auditDoc = await AuditDoc.findById(req.params.id);

    if (!auditDoc) {
      return res.status(404).json({
        status: 'error',
        message: 'Audit document not found'
      });
    }

    // Check access permissions
    if (req.userRole === 'manager') {
      // Manager can only access their own audit docs
      if (auditDoc.managerId !== (req.user.managerId || req.user._id.toString())) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You can only view your own audit documents.'
        });
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        auditDoc
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Create audit doc (Manager only)
const createAuditDoc = async (req, res) => {
  try {
    const { date, process } = req.body;

    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Document file is required'
      });
    }

    if (!date) {
      return res.status(400).json({
        status: 'error',
        message: 'Date is required'
      });
    }

    const managerId = req.user.managerId || req.user._id.toString();
    const createdBy = req.user.name || req.user.email || 'Manager';

    // Upload file to S3
    const file = req.file;
    const key = `audit-docs/${Date.now()}-${file.originalname}`;
    const uploadResult = await uploadFile(key, file.buffer, file.mimetype);

    const auditDocData = {
      document: {
        filename: file.originalname,
        originalName: file.originalname,
        s3Key: uploadResult.key,
        s3Url: uploadResult.location,
        fileSize: file.size,
        mimeType: file.mimetype
      },
      date: new Date(date),
      createdBy,
      managerId
    };

    if (process) {
      auditDocData.process = process;
    }

    const auditDoc = await AuditDoc.create(auditDocData);

    res.status(201).json({
      status: 'success',
      message: 'Audit document created successfully',
      data: {
        auditDoc
      }
    });
  } catch (error) {
    console.error('Error creating audit doc:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update audit doc (Manager only)
const updateAuditDoc = async (req, res) => {
  try {
    const { date, process } = req.body;

    const auditDoc = await AuditDoc.findById(req.params.id);

    if (!auditDoc) {
      return res.status(404).json({
        status: 'error',
        message: 'Audit document not found'
      });
    }

    // Check access permissions
    if (auditDoc.managerId !== (req.user.managerId || req.user._id.toString())) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only update your own audit documents.'
      });
    }

    const updateData = {};
    
    // If a new file is uploaded, replace the old one
    if (req.file) {
      // Delete old file from S3
      try {
        await deleteFile(auditDoc.document.s3Key);
      } catch (error) {
        console.error('Error deleting old file:', error);
        // Continue even if deletion fails
      }

      // Upload new file to S3
      const file = req.file;
      const key = `audit-docs/${Date.now()}-${file.originalname}`;
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

    if (date !== undefined) {
      updateData.date = new Date(date);
    }

    if (process !== undefined) {
      updateData.process = process;
    }

    const updatedAuditDoc = await AuditDoc.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      status: 'success',
      message: 'Audit document updated successfully',
      data: {
        auditDoc: updatedAuditDoc
      }
    });
  } catch (error) {
    console.error('Error updating audit doc:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete audit doc (Manager only)
const deleteAuditDoc = async (req, res) => {
  try {
    const auditDoc = await AuditDoc.findById(req.params.id);

    if (!auditDoc) {
      return res.status(404).json({
        status: 'error',
        message: 'Audit document not found'
      });
    }

    // Check access permissions
    if (auditDoc.managerId !== (req.user.managerId || req.user._id.toString())) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only delete your own audit documents.'
      });
    }

    // Delete file from S3
    try {
      await deleteFile(auditDoc.document.s3Key);
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      // Continue with soft delete even if S3 deletion fails
    }

    // Soft delete
    auditDoc.isActive = false;
    await auditDoc.save();

    res.status(200).json({
      status: 'success',
      message: 'Audit document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting audit doc:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

module.exports = {
  getAllAuditDocs,
  getAuditDoc,
  createAuditDoc,
  updateAuditDoc,
  deleteAuditDoc
};

