const TeamBatch = require('../models/TeamBatch');
const TeamMember = require('../models/TeamMember');
const { uploadFile, deleteFile } = require('../utils/s3');

/**
 * Create a new team batch
 */
const createTeamBatch = async (req, res) => {
  try {
    const { batchName, batchNumber, batchDescription, batchMembers, tags, status, startDate, endDate } = req.body;
    const user = req.user;

    // Verify user is a manager
    if (user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can create team batches' });
    }

    // Create batch data
    const batchData = {
      batchName,
      batchNumber,
      batchDescription,
      batchMembers: batchMembers ? JSON.parse(batchMembers) : [],
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      status: status || 'active',
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      createdBy: {
        userId: user._id,
        name: user.name,
        email: user.email
      }
    };

    // Handle batch image upload if file is provided
    if (req.file) {
      const key = `batch-images/${Date.now()}-${req.file.originalname}`;
      const uploadResult = await uploadFile(key, req.file.buffer, req.file.mimetype);
      
      batchData.batchImage = {
        filename: req.file.originalname,
        originalName: req.file.originalname,
        s3Key: uploadResult.key,
        s3Url: uploadResult.location,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      };
    }

    const teamBatch = new TeamBatch(batchData);
    await teamBatch.save();

    // Populate batch members for response
    await teamBatch.populate('batchMembers', 'name email department');

    res.status(201).json({
      message: 'Team batch created successfully',
      batch: teamBatch
    });
  } catch (error) {
    console.error('Create team batch error:', error);
    res.status(500).json({ 
      error: 'Failed to create team batch', 
      details: error.message 
    });
  }
};

/**
 * Get all team batches with pagination and filtering
 */
const getAllTeamBatches = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      createdBy, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (createdBy) {
      filter['createdBy.userId'] = createdBy;
    }
    
    if (search) {
      filter.$or = [
        { batchName: { $regex: search, $options: 'i' } },
        { batchDescription: { $regex: search, $options: 'i' } },
        { batchNumber: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const teamBatches = await TeamBatch.find(filter)
      .populate('batchMembers', 'name email department')
      .populate('createdBy.userId', 'name email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await TeamBatch.countDocuments(filter);

    res.status(200).json({
      message: 'Team batches retrieved successfully',
      batches: teamBatches,
      count: total
    });
  } catch (error) {
    console.error('Get team batches error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve team batches', 
      details: error.message 
    });
  }
};

/**
 * Get team batch by ID
 */
const getTeamBatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const teamBatch = await TeamBatch.findById(id)
      .populate('batchMembers', 'name email department position')
      .populate('createdBy.userId', 'name email');

    if (!teamBatch) {
      return res.status(404).json({ error: 'Team batch not found' });
    }

    res.status(200).json({
      message: 'Team batch retrieved successfully',
      batch: teamBatch
    });
  } catch (error) {
    console.error('Get team batch by ID error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve team batch', 
      details: error.message 
    });
  }
};

/**
 * Update team batch
 */
const updateTeamBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { batchName, batchNumber, batchDescription, batchMembers, tags, status, startDate, endDate } = req.body;
    const user = req.user;

    // Verify user is a manager
    if (user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can update team batches' });
    }

    const teamBatch = await TeamBatch.findById(id);

    if (!teamBatch) {
      return res.status(404).json({ error: 'Team batch not found' });
    }

    // Update fields
    if (batchName !== undefined) teamBatch.batchName = batchName;
    if (batchNumber !== undefined) teamBatch.batchNumber = batchNumber;
    if (batchDescription !== undefined) teamBatch.batchDescription = batchDescription;
    if (batchMembers !== undefined) {
      // Handle both array and string formats
      teamBatch.batchMembers = Array.isArray(batchMembers) ? batchMembers : JSON.parse(batchMembers);
    }
    if (tags !== undefined) {
      // Handle both array and string formats
      teamBatch.tags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
    }
    if (status !== undefined) teamBatch.status = status;
    if (startDate !== undefined) teamBatch.startDate = new Date(startDate);
    if (endDate !== undefined) teamBatch.endDate = new Date(endDate);

    await teamBatch.save();

    // Populate for response
    await teamBatch.populate('batchMembers', 'name email department');

    res.status(200).json({
      message: 'Team batch updated successfully',
      batch: teamBatch
    });
  } catch (error) {
    console.error('Update team batch error:', error);
    res.status(500).json({ 
      error: 'Failed to update team batch', 
      details: error.message 
    });
  }
};

/**
 * Delete team batch
 */
const deleteTeamBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Verify user is a manager
    if (user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can delete team batches' });
    }

    const teamBatch = await TeamBatch.findById(id);

    if (!teamBatch) {
      return res.status(404).json({ error: 'Team batch not found' });
    }

    // Delete batch image from S3 if exists
    if (teamBatch.batchImage && teamBatch.batchImage.s3Key) {
      try {
        await deleteFile(teamBatch.batchImage.s3Key);
      } catch (deleteError) {
        console.error(`Failed to delete image ${teamBatch.batchImage.s3Key}:`, deleteError);
      }
    }

    await TeamBatch.findByIdAndDelete(id);

    res.status(200).json({
      message: 'Team batch deleted successfully'
    });
  } catch (error) {
    console.error('Delete team batch error:', error);
    res.status(500).json({ 
      error: 'Failed to delete team batch', 
      details: error.message 
    });
  }
};

/**
 * Upload or update batch image
 */
const uploadBatchImage = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Verify user is a manager
    if (user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can upload batch images' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const teamBatch = await TeamBatch.findById(id);

    if (!teamBatch) {
      return res.status(404).json({ error: 'Team batch not found' });
    }

    // Delete old image if exists
    if (teamBatch.batchImage && teamBatch.batchImage.s3Key) {
      try {
        await deleteFile(teamBatch.batchImage.s3Key);
      } catch (deleteError) {
        console.error(`Failed to delete old image ${teamBatch.batchImage.s3Key}:`, deleteError);
      }
    }

    // Upload new image
    const key = `batch-images/${Date.now()}-${req.file.originalname}`;
    const uploadResult = await uploadFile(key, req.file.buffer, req.file.mimetype);
    
    const imageData = {
      filename: req.file.originalname,
      originalName: req.file.originalname,
      s3Key: uploadResult.key,
      s3Url: uploadResult.location,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    };

    await teamBatch.updateImage(imageData);

    res.status(200).json({
      message: 'Batch image uploaded successfully',
      teamBatch: teamBatch,
      image: imageData
    });
  } catch (error) {
    console.error('Upload batch image error:', error);
    res.status(500).json({ 
      error: 'Failed to upload batch image', 
      details: error.message 
    });
  }
};

/**
 * Remove batch image
 */
const removeBatchImage = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Verify user is a manager
    if (user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can remove batch images' });
    }

    const teamBatch = await TeamBatch.findById(id);

    if (!teamBatch) {
      return res.status(404).json({ error: 'Team batch not found' });
    }

    if (!teamBatch.batchImage || !teamBatch.batchImage.s3Key) {
      return res.status(404).json({ error: 'No image found for this batch' });
    }

    // Delete image from S3
    try {
      await deleteFile(teamBatch.batchImage.s3Key);
    } catch (deleteError) {
      console.error(`Failed to delete image ${teamBatch.batchImage.s3Key}:`, deleteError);
    }

    // Remove image from batch
    await teamBatch.removeImage();

    res.status(200).json({
      message: 'Batch image removed successfully',
      teamBatch: teamBatch
    });
  } catch (error) {
    console.error('Remove batch image error:', error);
    res.status(500).json({ 
      error: 'Failed to remove batch image', 
      details: error.message 
    });
  }
};

/**
 * Add member to batch
 */
const addMemberToBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body;
    const user = req.user;

    // Verify user is a manager
    if (user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can add members to batches' });
    }

    const teamBatch = await TeamBatch.findById(id);
    if (!teamBatch) {
      return res.status(404).json({ error: 'Team batch not found' });
    }

    // Verify member exists
    const member = await TeamMember.findById(memberId);
    if (!member) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    await teamBatch.addMember(memberId);
    await teamBatch.populate('batchMembers', 'name email department');

    res.status(200).json({
      message: 'Member added to batch successfully',
      teamBatch: teamBatch
    });
  } catch (error) {
    console.error('Add member to batch error:', error);
    res.status(500).json({ 
      error: 'Failed to add member to batch', 
      details: error.message 
    });
  }
};

/**
 * Remove member from batch
 */
const removeMemberFromBatch = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const user = req.user;

    // Verify user is a manager
    if (user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can remove members from batches' });
    }

    const teamBatch = await TeamBatch.findById(id);
    if (!teamBatch) {
      return res.status(404).json({ error: 'Team batch not found' });
    }

    await teamBatch.removeMember(memberId);
    await teamBatch.populate('batchMembers', 'name email department');

    res.status(200).json({
      message: 'Member removed from batch successfully',
      teamBatch: teamBatch
    });
  } catch (error) {
    console.error('Remove member from batch error:', error);
    res.status(500).json({ 
      error: 'Failed to remove member from batch', 
      details: error.message 
    });
  }
};

/**
 * Get batches created by current manager
 */
const getMyBatches = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can access this endpoint' });
    }

    const batches = await TeamBatch.findByCreator(user._id)
      .populate('batchMembers', 'name email department')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Manager batches retrieved successfully',
      teamBatches: batches,
      count: batches.length
    });
  } catch (error) {
    console.error('Get my batches error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve manager batches', 
      details: error.message 
    });
  }
};

/**
 * Get active batches
 */
const getActiveBatches = async (req, res) => {
  try {
    const batches = await TeamBatch.findActive()
      .populate('batchMembers', 'name email department')
      .populate('createdBy.userId', 'name email');

    res.status(200).json({
      message: 'Active batches retrieved successfully',
      teamBatches: batches,
      count: batches.length
    });
  } catch (error) {
    console.error('Get active batches error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve active batches', 
      details: error.message 
    });
  }
};

/**
 * Get batch statistics
 */
const getBatchStatistics = async (req, res) => {
  try {
    const stats = await TeamBatch.getStatistics();

    res.status(200).json({
      message: 'Batch statistics retrieved successfully',
      statistics: stats
    });
  } catch (error) {
    console.error('Get batch statistics error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve batch statistics', 
      details: error.message 
    });
  }
};

module.exports = {
  createTeamBatch,
  getAllTeamBatches,
  getTeamBatchById,
  updateTeamBatch,
  deleteTeamBatch,
  uploadBatchImage,
  removeBatchImage,
  addMemberToBatch,
  removeMemberFromBatch,
  getMyBatches,
  getActiveBatches,
  getBatchStatistics
};
