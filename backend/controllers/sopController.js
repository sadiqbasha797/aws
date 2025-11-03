const SOP = require('../models/SOP');
const Bin = require('../models/Bin');
const { uploadFile, deleteFile } = require('../utils/s3');

/**
 * Create a new SOP
 */
const createSOP = async (req, res) => {
  try {
    const { title, process, sopUrl } = req.body;
    const user = req.user;

    // Create SOP data
    const sopData = {
      title,
      process,
      sopUrl: sopUrl || undefined,
      createdBy: {
        userId: user._id,
        userType: user.role === 'manager' ? 'Manager' : 'TeamMember',
        name: user.name,
        email: user.email
      },
      updatedBy: {
        userId: user._id,
        userType: user.role === 'manager' ? 'Manager' : 'TeamMember',
        name: user.name,
        email: user.email
      }
    };

    // Handle document uploads if files are provided
    if (req.files && req.files.length > 0) {
      const documents = [];
      
      for (const file of req.files) {
        const key = `sop-documents/${Date.now()}-${file.originalname}`;
        const uploadResult = await uploadFile(key, file.buffer, file.mimetype);
        
        documents.push({
          filename: file.originalname,
          originalName: file.originalname,
          s3Key: uploadResult.key,
          s3Url: uploadResult.location,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedBy: {
            userId: user._id,
            userType: user.role === 'manager' ? 'Manager' : 'TeamMember',
            name: user.name,
            email: user.email
          }
        });
      }
      
      sopData.documents = documents;
    }

    const sop = new SOP(sopData);
    await sop.save();

    res.status(201).json({
      message: 'SOP created successfully',
      sop: sop
    });
  } catch (error) {
    console.error('Create SOP error:', error);
    res.status(500).json({ 
      error: 'Failed to create SOP', 
      details: error.message 
    });
  }
};

/**
 * Get all SOPs with pagination and filtering
 */
const getAllSOPs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      createdBy, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { isDeleted: false };
    
    if (createdBy) {
      filter['createdBy.userId'] = createdBy;
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { process: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sort
    };

    const sops = await SOP.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await SOP.countDocuments(filter);

    res.status(200).json({
      message: 'SOPs retrieved successfully',
      sops: sops,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get SOPs error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve SOPs', 
      details: error.message 
    });
  }
};

/**
 * Get SOP by ID
 */
const getSOPById = async (req, res) => {
  try {
    const { id } = req.params;

    const sop = await SOP.findById(id);

    if (!sop) {
      return res.status(404).json({ error: 'SOP not found' });
    }

    res.status(200).json({
      message: 'SOP retrieved successfully',
      sop: sop
    });
  } catch (error) {
    console.error('Get SOP by ID error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve SOP', 
      details: error.message 
    });
  }
};

/**
 * Update SOP
 */
const updateSOP = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, process, sopUrl } = req.body;
    const user = req.user;

    const sop = await SOP.findById(id);

    if (!sop) {
      return res.status(404).json({ error: 'SOP not found' });
    }

    // Update fields
    if (title) sop.title = title;
    if (process) sop.process = process;
    if (sopUrl !== undefined) sop.sopUrl = sopUrl || undefined;

    // Update updatedBy information
    sop.updatedBy = {
      userId: user._id,
      userType: user.role === 'manager' ? 'Manager' : 'TeamMember',
      name: user.name,
      email: user.email
    };

    await sop.save();

    res.status(200).json({
      message: 'SOP updated successfully',
      sop: sop
    });
  } catch (error) {
    console.error('Update SOP error:', error);
    res.status(500).json({ 
      error: 'Failed to update SOP', 
      details: error.message 
    });
  }
};

/**
 * Delete SOP
 */
const deleteSOP = async (req, res) => {
  try {
    const { id } = req.params;

    const sop = await SOP.findById(id);

    if (!sop) {
      return res.status(404).json({ error: 'SOP not found' });
    }

    // Delete all associated documents from S3
    for (const document of sop.documents) {
      try {
        await deleteFile(document.s3Key);
      } catch (deleteError) {
        console.error(`Failed to delete file ${document.s3Key}:`, deleteError);
      }
    }

    await SOP.findByIdAndDelete(id);

    res.status(200).json({
      message: 'SOP deleted successfully'
    });
  } catch (error) {
    console.error('Delete SOP error:', error);
    res.status(500).json({ 
      error: 'Failed to delete SOP', 
      details: error.message 
    });
  }
};

/**
 * Add documents to existing SOP
 */
const addDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const sop = await SOP.findById(id);

    if (!sop) {
      return res.status(404).json({ error: 'SOP not found' });
    }

    const newDocuments = [];

    for (const file of req.files) {
      const key = `sop-documents/${Date.now()}-${file.originalname}`;
      const uploadResult = await uploadFile(key, file.buffer, file.mimetype);
      
      newDocuments.push({
        filename: file.originalname,
        originalName: file.originalname,
        s3Key: uploadResult.key,
        s3Url: uploadResult.location,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: {
          userId: user._id,
          userType: user.role === 'manager' ? 'Manager' : 'TeamMember',
          name: user.name,
          email: user.email
        }
      });
    }

    sop.documents.push(...newDocuments);
    
    // Update updatedBy information
    sop.updatedBy = {
      userId: user._id,
      userType: user.role === 'manager' ? 'Manager' : 'TeamMember',
      name: user.name,
      email: user.email
    };

    await sop.save();

    res.status(200).json({
      message: 'Documents added successfully',
      sop: sop,
      addedDocuments: newDocuments
    });
  } catch (error) {
    console.error('Add documents error:', error);
    res.status(500).json({ 
      error: 'Failed to add documents', 
      details: error.message 
    });
  }
};

/**
 * Remove document from SOP
 */
const removeDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;
    const user = req.user;

    const sop = await SOP.findById(id);

    if (!sop) {
      return res.status(404).json({ error: 'SOP not found' });
    }

    const document = sop.documents.id(documentId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from S3
    try {
      await deleteFile(document.s3Key);
    } catch (deleteError) {
      console.error(`Failed to delete file ${document.s3Key}:`, deleteError);
    }

    // Remove document from SOP
    sop.documents.id(documentId).remove();
    
    // Update updatedBy information
    sop.updatedBy = {
      userId: user._id,
      userType: user.role === 'manager' ? 'Manager' : 'TeamMember',
      name: user.name,
      email: user.email
    };

    await sop.save();

    res.status(200).json({
      message: 'Document removed successfully',
      sop: sop
    });
  } catch (error) {
    console.error('Remove document error:', error);
    res.status(500).json({ 
      error: 'Failed to remove document', 
      details: error.message 
    });
  }
};

/**
 * Get SOPs by current user
 */
const getMySOPs = async (req, res) => {
  try {
    const user = req.user;
    const userType = user.role === 'manager' ? 'Manager' : 'TeamMember';

    const sops = await SOP.findByCreator(user._id, userType);

    res.status(200).json({
      message: 'User SOPs retrieved successfully',
      sops: sops,
      count: sops.length
    });
  } catch (error) {
    console.error('Get my SOPs error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve user SOPs', 
      details: error.message 
    });
  }
};

/**
 * Get active SOPs
 */
const getActiveSOPs = async (req, res) => {
  try {
    const sops = await SOP.findActive();

    res.status(200).json({
      message: 'Active SOPs retrieved successfully',
      sops: sops,
      count: sops.length
    });
  } catch (error) {
    console.error('Get active SOPs error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve active SOPs', 
      details: error.message 
    });
  }
};

/**
 * Soft delete SOP (move to bin)
 */
const softDeleteSOP = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const sop = await SOP.findById(id);
    if (!sop) {
      return res.status(404).json({ error: 'SOP not found' });
    }

    // Move to bin
    await Bin.softDelete(sop, 'sops', user, {
      metadata: {}
    });

    // Mark as deleted
    sop.isDeleted = true;
    sop.deletedAt = new Date();
    sop.deletedBy = {
      userId: user._id,
      userType: user.role === 'manager' ? 'Manager' : 'TeamMember',
      name: user.name,
      email: user.email
    };
    await sop.save();

    res.status(200).json({ message: 'SOP moved to bin successfully' });
  } catch (error) {
    console.error('Soft delete SOP error:', error);
    res.status(500).json({ 
      error: 'Failed to delete SOP', 
      details: error.message 
    });
  }
};

/**
 * Get bin items for user
 */
const getBinItems = async (req, res) => {
  try {
    const user = req.user;
    const { collection } = req.query;

    let query = {
      'deletedBy.userId': user._id,
      isRestored: false
    };

    if (collection) {
      query.collectionName = collection;
    }

    const binItems = await Bin.find(query).sort({ deletedAt: -1 });

    res.status(200).json({
      message: 'Bin items retrieved successfully',
      items: binItems,
      count: binItems.length
    });
  } catch (error) {
    console.error('Get bin items error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve bin items', 
      details: error.message 
    });
  }
};

/**
 * Restore item from bin
 */
const restoreFromBin = async (req, res) => {
  try {
    const { binId } = req.params;
    const user = req.user;

    const binItem = await Bin.findById(binId);
    if (!binItem) {
      return res.status(404).json({ error: 'Bin item not found' });
    }

    if (binItem.isRestored) {
      return res.status(400).json({ error: 'Item already restored' });
    }

    // Restore the item
    const restoredItem = await binItem.restore(user);

    res.status(200).json({
      message: 'Item restored successfully',
      item: restoredItem
    });
  } catch (error) {
    console.error('Restore from bin error:', error);
    res.status(500).json({ 
      error: 'Failed to restore item', 
      details: error.message 
    });
  }
};

module.exports = {
  createSOP,
  getAllSOPs,
  getSOPById,
  updateSOP,
  deleteSOP,
  addDocuments,
  removeDocument,
  getMySOPs,
  getActiveSOPs,
  softDeleteSOP,
  // Bin methods
  getBinItems,
  restoreFromBin
};
