const QuickLink = require('../models/QuickLink');

/**
 * Create a new Quick Link
 */
const createQuickLink = async (req, res) => {
  try {
    const { title, link } = req.body;
    const user = req.user;

    // Validate required fields
    if (!title || !link) {
      return res.status(400).json({ 
        error: 'Title and link are required' 
      });
    }

    // Ensure link has protocol
    let formattedLink = link;
    if (!link.startsWith('http://') && !link.startsWith('https://')) {
      formattedLink = `https://${link}`;
    }

    // Create Quick Link data
    const quickLinkData = {
      title,
      link: formattedLink,
      createdBy: {
        userId: user._id,
        userType: user.role === 'manager' ? 'Manager' : 'TeamMember',
        name: user.name,
        email: user.email
      }
    };

    const quickLink = new QuickLink(quickLinkData);
    await quickLink.save();

    res.status(201).json({
      message: 'Quick Link created successfully',
      quickLink: quickLink
    });
  } catch (error) {
    console.error('Create Quick Link error:', error);
    res.status(500).json({ 
      error: 'Failed to create Quick Link', 
      details: error.message 
    });
  }
};

/**
 * Get all Quick Links with pagination and filtering
 */
const getAllQuickLinks = async (req, res) => {
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
    const filter = {};
    
    if (createdBy) {
      filter['createdBy.userId'] = createdBy;
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { link: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const quickLinks = await QuickLink.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const totalItems = await QuickLink.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limitNum);

    res.status(200).json({
      message: 'Quick Links retrieved successfully',
      quickLinks: quickLinks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalItems: totalItems,
        itemsPerPage: limitNum
      }
    });
  } catch (error) {
    console.error('Get all Quick Links error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve Quick Links', 
      details: error.message 
    });
  }
};

/**
 * Get Quick Link by ID
 */
const getQuickLinkById = async (req, res) => {
  try {
    const { id } = req.params;

    const quickLink = await QuickLink.findById(id);

    if (!quickLink) {
      return res.status(404).json({ error: 'Quick Link not found' });
    }

    res.status(200).json({
      message: 'Quick Link retrieved successfully',
      quickLink: quickLink
    });
  } catch (error) {
    console.error('Get Quick Link by ID error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve Quick Link', 
      details: error.message 
    });
  }
};

/**
 * Update Quick Link
 */
const updateQuickLink = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, link } = req.body;
    const user = req.user;

    const quickLink = await QuickLink.findById(id);

    if (!quickLink) {
      return res.status(404).json({ error: 'Quick Link not found' });
    }

    // Update fields
    if (title) {
      quickLink.title = title;
    }
    
    if (link) {
      // Ensure link has protocol
      let formattedLink = link;
      if (!link.startsWith('http://') && !link.startsWith('https://')) {
        formattedLink = `https://${link}`;
      }
      quickLink.link = formattedLink;
    }

    await quickLink.save();

    res.status(200).json({
      message: 'Quick Link updated successfully',
      quickLink: quickLink
    });
  } catch (error) {
    console.error('Update Quick Link error:', error);
    res.status(500).json({ 
      error: 'Failed to update Quick Link', 
      details: error.message 
    });
  }
};

/**
 * Delete Quick Link
 */
const deleteQuickLink = async (req, res) => {
  try {
    const { id } = req.params;

    const quickLink = await QuickLink.findById(id);

    if (!quickLink) {
      return res.status(404).json({ error: 'Quick Link not found' });
    }

    await QuickLink.findByIdAndDelete(id);

    res.status(200).json({
      message: 'Quick Link deleted successfully'
    });
  } catch (error) {
    console.error('Delete Quick Link error:', error);
    res.status(500).json({ 
      error: 'Failed to delete Quick Link', 
      details: error.message 
    });
  }
};

/**
 * Get Quick Links by current user
 */
const getMyQuickLinks = async (req, res) => {
  try {
    const user = req.user;

    const quickLinks = await QuickLink.find({
      'createdBy.userId': user._id
    }).sort({ createdAt: -1 });

    res.status(200).json({
      message: 'User Quick Links retrieved successfully',
      quickLinks: quickLinks,
      count: quickLinks.length
    });
  } catch (error) {
    console.error('Get my Quick Links error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve user Quick Links', 
      details: error.message 
    });
  }
};

module.exports = {
  createQuickLink,
  getAllQuickLinks,
  getQuickLinkById,
  updateQuickLink,
  deleteQuickLink,
  getMyQuickLinks
};

