const ProductivityData = require('../models/ProductivityData');
const TeamMember = require('../models/TeamMember');
const { sendProductivityNotificationEmail } = require('../utils/email');

// Get all productivity data (Manager only)
const getAllProductivityData = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { isActive: true };
    
    // If user is a manager, filter by their teamManager
    if (req.userRole === 'manager') {
      filter.teamManager = req.user.managerId || req.user._id.toString();
    }

    if (req.query.teamManager) {
      filter.teamManager = req.query.teamManager;
    }
    if (req.query.associateName) {
      filter.associateName = { $regex: req.query.associateName, $options: 'i' };
    }
    if (req.query.month) {
      filter.month = req.query.month;
    }
    if (req.query.week) {
      filter.week = req.query.week;
    }
    if (req.query.year) {
      filter.year = parseInt(req.query.year);
    }
    if (req.query.minProductivity) {
      filter.productivityPercentage = { $gte: parseFloat(req.query.minProductivity) };
    }
    if (req.query.maxProductivity) {
      filter.productivityPercentage = { 
        ...filter.productivityPercentage, 
        $lte: parseFloat(req.query.maxProductivity) 
      };
    }
    if (req.query.performanceCategory) {
      filter.performanceCategory = req.query.performanceCategory;
    }
    if (req.query.search) {
      filter.$or = [
        { associateName: { $regex: req.query.search, $options: 'i' } },
        { teamManager: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const productivityData = await ProductivityData.find(filter)
      .sort({ productivityPercentage: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ProductivityData.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: productivityData.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        productivityData
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get productivity data by ID
const getProductivityData = async (req, res) => {
  try {
    const productivityData = await ProductivityData.findById(req.params.id);

    if (!productivityData) {
      return res.status(404).json({
        status: 'error',
        message: 'Productivity data not found'
      });
    }

    // Check access permissions
    if (req.userRole === 'team_member') {
      // Team member can only access their own data
      if (productivityData.associateName !== req.user.name) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You can only view your own data.'
        });
      }
    } else if (req.userRole === 'manager') {
      // Manager can only access data from their team
      if (productivityData.teamManager !== (req.user.managerId || req.user._id.toString())) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You can only view data from your team.'
        });
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        productivityData
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get current team member's productivity data
const getMyProductivityData = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {
      associateName: { $regex: new RegExp(`^${req.user.name}$`, 'i') },
      isActive: true
    };

    if (req.query.year) {
      filter.year = parseInt(req.query.year);
    }
    if (req.query.month) {
      filter.month = req.query.month;
    }
    if (req.query.week) {
      filter.week = req.query.week;
    }

    const productivityData = await ProductivityData.find(filter)
      .sort({ year: -1, month: -1, weekNumber: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ProductivityData.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: productivityData.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        productivityData
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Create productivity data (Manager only)
const createProductivityData = async (req, res) => {
  try {
    const {
      teamManager,
      associateName,
      month,
      week,
      productivityPercentage,
      year,
      notes
    } = req.body;

    // Check if team member exists by name or da_id (case-insensitive)
    const associateNameUpper = associateName.toUpperCase();
    const teamMember = await TeamMember.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${associateName}$`, 'i') } },
        { da_id: { $regex: new RegExp(`^${associateNameUpper}$`, 'i') } }
      ],
      isActive: true
    });
    
    if (!teamMember) {
      return res.status(400).json({
        status: 'error',
        message: 'Team member with this name or DA ID does not exist'
      });
    }
    
    // Use the actual name from the database
    const actualAssociateName = teamMember.name;

    // Normalize month name (convert abbreviated to full name)
    const normalizedMonth = normalizeMonth(month);
    if (!normalizedMonth || !['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].includes(normalizedMonth)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid month: '${month}'. Month must be a valid month name (e.g., January, Feb, Jan, etc.)`
      });
    }

    // Normalize week format
    const normalizedWeek = normalizeWeek(week);
    if (!normalizedWeek || !normalizedWeek.match(/^Week \d+$/)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid week format: '${week}'. Week must be a number between 1-53 or in format like 'Week 1', 'week1', etc.`
      });
    }
    
    // Extract week number from normalized week string
    const weekNumber = normalizedWeek ? parseInt(normalizedWeek.replace('Week ', '')) : null;

    // Check if productivity data already exists for this associate and week (use normalized week)
    const existingData = await ProductivityData.findOne({
      associateName: actualAssociateName,
      teamManager: teamManager || req.user.managerId || req.user._id.toString(),
      year: year || new Date().getFullYear(),
      week: normalizedWeek || `Week ${new Date().getWeek()}`,
      isActive: true
    });

    if (existingData) {
      return res.status(400).json({
        status: 'error',
        message: 'Productivity data for this associate already exists for this week'
      });
    }

    const productivityData = await ProductivityData.create({
      teamManager: teamManager || req.user.managerId || req.user._id.toString(),
      associateName: actualAssociateName,
      month: normalizedMonth || new Date().toLocaleString('default', { month: 'long' }),
      week: normalizedWeek || `Week ${new Date().getWeek()}`,
      productivityPercentage,
      year: year || new Date().getFullYear(),
      weekNumber: weekNumber || new Date().getWeek(),
      notes
    });

    // Send email notification to team member asynchronously
    // Don't block the response if email fails
    sendProductivityNotificationEmail(teamMember, [productivityData]).catch(error => {
      console.error('Error sending productivity notification email:', error);
    });

    res.status(201).json({
      status: 'success',
      message: 'Productivity data created successfully',
      data: {
        productivityData
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update productivity data (Manager only)
const updateProductivityData = async (req, res) => {
  try {
    const {
      associateName,
      month,
      week,
      productivityPercentage,
      year,
      notes
    } = req.body;

    // Check if we're changing associate name or week, and if so, check for duplicates
    if (associateName || week || year) {
      const currentRecord = await ProductivityData.findById(req.params.id);
      if (!currentRecord) {
        return res.status(404).json({
          status: 'error',
          message: 'Productivity data not found'
        });
      }

      const newAssociateName = associateName || currentRecord.associateName;
      const newWeek = week || currentRecord.week;
      const newYear = year || currentRecord.year;

      // Check if another record exists with the same associate, week, and year (excluding current record)
      const existingData = await ProductivityData.findOne({
        _id: { $ne: req.params.id }, // Exclude current record
        associateName: newAssociateName,
        teamManager: req.user.managerId || req.user._id.toString(),
        year: newYear,
        week: newWeek,
        isActive: true
      });

      if (existingData) {
        return res.status(400).json({
          status: 'error',
          message: 'Productivity data for this associate already exists for this week'
        });
      }
    }

    const updateData = {};
    if (associateName) updateData.associateName = associateName;
    if (month) updateData.month = month;
    if (week) {
      updateData.week = week;
      updateData.weekNumber = parseInt(week.replace('Week ', ''));
    }
    if (productivityPercentage !== undefined) updateData.productivityPercentage = productivityPercentage;
    if (year) updateData.year = year;
    if (notes !== undefined) updateData.notes = notes;

    const productivityData = await ProductivityData.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!productivityData) {
      return res.status(404).json({
        status: 'error',
        message: 'Productivity data not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Productivity data updated successfully',
      data: {
        productivityData
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete productivity data (Manager only)
const deleteProductivityData = async (req, res) => {
  try {
    const productivityData = await ProductivityData.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!productivityData) {
      return res.status(404).json({
        status: 'error',
        message: 'Productivity data not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Productivity data deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get aggregated team member performance (Manager only)
const getAggregatedTeamPerformance = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const teamManager = req.user.managerId || req.user._id.toString();

    // Build match criteria
    const matchCriteria = { teamManager, isActive: true };
    
    if (req.query.year) {
      matchCriteria.year = parseInt(req.query.year);
    }
    if (req.query.month) {
      matchCriteria.month = req.query.month;
    }
    if (req.query.search) {
      matchCriteria.$or = [
        { associateName: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const aggregatedData = await ProductivityData.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: '$associateName',
          associateName: { $first: '$associateName' },
          avgProductivity: { $avg: '$productivityPercentage' },
          maxProductivity: { $max: '$productivityPercentage' },
          minProductivity: { $min: '$productivityPercentage' },
          recordCount: { $sum: 1 },
          latestRecord: { $max: '$createdAt' },
          weeks: { $addToSet: '$week' },
          months: { $addToSet: '$month' }
        }
      },
      { $sort: { avgProductivity: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          associateName: 1,
          productivityPercentage: { $round: ['$avgProductivity', 2] },
          maxProductivity: { $round: ['$maxProductivity', 2] },
          minProductivity: { $round: ['$minProductivity', 2] },
          recordCount: 1,
          latestRecord: 1,
          weeks: 1,
          months: 1
        }
      }
    ]);

    // Get total count for pagination
    const totalCount = await ProductivityData.aggregate([
      { $match: matchCriteria },
      { $group: { _id: '$associateName' } },
      { $count: 'total' }
    ]);

    const total = totalCount.length > 0 ? totalCount[0].total : 0;

    res.status(200).json({
      status: 'success',
      results: aggregatedData.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        productivityData: aggregatedData
      }
    });
  } catch (error) {
    console.error('Error in getAggregatedTeamPerformance:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get top performers (Manager only)
const getTopPerformers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const year = req.query.year ? parseInt(req.query.year) : null;
    const month = req.query.month || null;
    const teamManager = req.user.managerId || req.user._id.toString();

    const topPerformers = await ProductivityData.getTopPerformers(teamManager, limit, year, month);

    res.status(200).json({
      status: 'success',
      results: topPerformers.length,
      data: {
        topPerformers
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get productivity statistics (Manager only)
const getProductivityStats = async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : null;
    const month = req.query.month || null;
    const teamManager = req.user.managerId || req.user._id.toString();
    
    const stats = await ProductivityData.getProductivityStats(teamManager, year, month);

    res.status(200).json({
      status: 'success',
      data: {
        stats: stats[0] || {
          totalAssociates: 0,
          avgProductivity: 0,
          maxProductivity: 0,
          minProductivity: 0,
          aboveTarget: 0,
          onTarget: 0,
          belowTarget: 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get productivity by week (Manager only)
const getProductivityByWeek = async (req, res) => {
  try {
    const { year, weekNumber } = req.params;
    const teamManager = req.user.managerId || req.user._id.toString();

    const productivityData = await ProductivityData.getProductivityByWeek(
      teamManager, 
      parseInt(year), 
      parseInt(weekNumber)
    );

    res.status(200).json({
      status: 'success',
      results: productivityData.length,
      data: {
        period: { year: parseInt(year), weekNumber: parseInt(weekNumber) },
        productivityData
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get productivity by month (Manager only)
const getProductivityByMonth = async (req, res) => {
  try {
    const { year, month } = req.params;
    const teamManager = req.user.managerId || req.user._id.toString();

    const productivityData = await ProductivityData.getProductivityByMonth(
      teamManager, 
      parseInt(year), 
      month
    );

    res.status(200).json({
      status: 'success',
      results: productivityData.length,
      data: {
        period: { year: parseInt(year), month },
        productivityData
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get team member's productivity history
const getTeamMemberProductivityHistory = async (req, res) => {
  try {
    const associateName = req.params.associateName;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Check if team member exists by name or da_id (case-insensitive)
    const associateNameUpper = associateName.toUpperCase();
    const teamMember = await TeamMember.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${associateName}$`, 'i') } },
        { da_id: { $regex: new RegExp(`^${associateNameUpper}$`, 'i') } }
      ],
      isActive: true
    });
    
    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found'
      });
    }

    // Check access permissions
    if (req.userRole === 'team_member' && req.user.name !== associateName) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only view your own productivity history.'
      });
    }

    if (req.userRole === 'manager' && teamMember.managerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only view productivity history of your team members.'
      });
    }

    const productivityHistory = await ProductivityData.find({
      associateName,
      isActive: true
    })
      .sort({ year: -1, month: -1, weekNumber: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ProductivityData.countDocuments({
      associateName,
      isActive: true
    });

    res.status(200).json({
      status: 'success',
      results: productivityHistory.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        teamMember: {
          name: teamMember.name,
          da_id: teamMember.da_id,
          email: teamMember.email
        },
        productivityHistory
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get performance trends (Manager only)
const getPerformanceTrends = async (req, res) => {
  try {
    const teamManager = req.user.managerId || req.user._id.toString();
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

    // Get all productivity data for the year
    const productivityData = await ProductivityData.find({
      teamManager,
      year,
      isActive: true
    }).sort({ weekNumber: 1 });

    // Group by associate and calculate trends
    const trends = {};
    productivityData.forEach(data => {
      if (!trends[data.associateName]) {
        trends[data.associateName] = [];
      }
      trends[data.associateName].push({
        week: data.week,
        weekNumber: data.weekNumber,
        productivity: data.productivityPercentage,
        performanceCategory: data.performanceCategory
      });
    });

    // Calculate trend direction for each associate
    const trendAnalysis = Object.keys(trends).map(associateName => {
      const data = trends[associateName];
      if (data.length < 2) {
        return {
          associateName,
          trend: 'Insufficient data',
          data
        };
      }

      const firstHalf = data.slice(0, Math.floor(data.length / 2));
      const secondHalf = data.slice(Math.floor(data.length / 2));

      const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.productivity, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.productivity, 0) / secondHalf.length;

      let trend = 'Stable';
      if (secondHalfAvg > firstHalfAvg + 5) trend = 'Improving';
      else if (secondHalfAvg < firstHalfAvg - 5) trend = 'Declining';

      return {
        associateName,
        trend,
        firstHalfAvg: parseFloat(firstHalfAvg.toFixed(2)),
        secondHalfAvg: parseFloat(secondHalfAvg.toFixed(2)),
        data
      };
    });

    res.status(200).json({
      status: 'success',
      results: trendAnalysis.length,
      data: {
        year,
        trendAnalysis
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Helper function to normalize month names
const normalizeMonth = (month) => {
  if (!month) return null;
  
  const monthStr = String(month).trim();
  
  // First check if it's a number (1-12)
  const monthNum = parseInt(monthStr);
  if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[monthNum - 1];
  }
  
  // Then check text formats
  const monthMap = {
    'jan': 'January',
    'feb': 'February',
    'mar': 'March',
    'apr': 'April',
    'may': 'May',
    'jun': 'June',
    'jul': 'July',
    'aug': 'August',
    'sep': 'September',
    'oct': 'October',
    'nov': 'November',
    'dec': 'December',
    'january': 'January',
    'february': 'February',
    'march': 'March',
    'april': 'April',
    'may': 'May',
    'june': 'June',
    'july': 'July',
    'august': 'August',
    'september': 'September',
    'october': 'October',
    'november': 'November',
    'december': 'December'
  };
  
  const normalized = monthMap[monthStr.toLowerCase()];
  return normalized || monthStr; // Return original if not found
};

// Helper function to normalize week format
const normalizeWeek = (week) => {
  if (!week) return null;
  
  const weekStr = String(week).trim();
  
  // Remove all spaces and convert to lowercase for easier matching
  const weekLower = weekStr.replace(/\s+/g, '').toLowerCase();
  
  // Handle formats like: week1, week 1, Week 1, WEEK 1, WEEK1, week-1, etc.
  // Extract number from any format
  const weekMatch = weekLower.match(/week[^0-9]*(\d+)/) || weekLower.match(/^(\d+)$/);
  
  if (weekMatch) {
    const weekNum = parseInt(weekMatch[1]);
    if (weekNum >= 1 && weekNum <= 53) {
      return `Week ${weekNum}`;
    }
  }
  
  // If it's already in "Week X" format, validate and return
  const existingWeekMatch = weekStr.match(/^week\s*(\d+)$/i);
  if (existingWeekMatch) {
    const weekNum = parseInt(existingWeekMatch[1]);
    if (weekNum >= 1 && weekNum <= 53) {
      return `Week ${weekNum}`;
    }
  }
  
  return weekStr; // Return original if can't parse
};

// Bulk create productivity data
const bulkCreateProductivityData = async (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid data. Expected an array of productivity data records.'
      });
    }

    const teamManager = req.user.managerId || req.user._id.toString();
    const results = {
      success: [],
      failed: [],
      errors: []
    };

    // Map to store team member email -> productivity data array for email notifications
    const teamMemberProductivityMap = new Map();

    // Process each record
    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      
      try {
        // Validate required fields
        if (!record.associateName || !record.month || !record.week || record.productivityPercentage === undefined) {
          results.failed.push({ index: i, record, error: 'Missing required fields' });
          continue;
        }
        
        console.log(`Processing record ${i + 1}/${data.length}:`, {
          associateName: record.associateName,
          month: record.month,
          week: record.week,
          year: record.year
        });

        // Check if team member exists by name or da_id (case-insensitive)
        const associateNameUpper = record.associateName.toUpperCase();
        const teamMember = await TeamMember.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${record.associateName}$`, 'i') } },
            { da_id: { $regex: new RegExp(`^${associateNameUpper}$`, 'i') } }
          ],
          isActive: true
        });
        
        if (!teamMember) {
          results.failed.push({ 
            index: i, 
            record, 
            error: `Team member with name or DA ID '${record.associateName}' does not exist` 
          });
          continue;
        }
        
        // Use the actual name from the database
        const actualAssociateName = teamMember.name;

        // Normalize month name (convert abbreviated to full name)
        const normalizedMonth = normalizeMonth(record.month);
        if (!normalizedMonth || !['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].includes(normalizedMonth)) {
          results.failed.push({ 
            index: i, 
            record, 
            error: `Invalid month: '${record.month}'. Month must be a valid month name (e.g., January, Feb, Jan, etc.)` 
          });
          continue;
        }

        // Normalize week format (handle all formats: 12, 3, week1, week 1, Week 1, WEEK 1, WEEK1, etc.)
        const normalizedWeek = normalizeWeek(record.week);
        if (!normalizedWeek || !normalizedWeek.match(/^Week \d+$/)) {
          results.failed.push({ 
            index: i, 
            record, 
            error: `Invalid week format: '${record.week}'. Week must be a number between 1-53 or in format like 'Week 1', 'week1', etc.` 
          });
          continue;
        }
        
        // Extract week number from normalized week string
        const weekMatch = normalizedWeek.match(/\d+/);
        const weekNumber = weekMatch ? parseInt(weekMatch[0]) : null;

        if (!weekNumber || weekNumber < 1 || weekNumber > 53) {
          results.failed.push({ 
            index: i, 
            record, 
            error: 'Invalid week number. Week must be between 1 and 53' 
          });
          continue;
        }

        // Create new record (allow duplicates - don't check for existing records)
        const productivityData = await ProductivityData.create({
          teamManager: record.teamManager || teamManager,
          associateName: actualAssociateName,
          month: normalizedMonth,
          week: normalizedWeek,
          productivityPercentage: record.productivityPercentage || 0,
          year: record.year || new Date().getFullYear(),
          weekNumber: weekNumber
        });

        console.log(`Successfully created record ${i + 1}:`, {
          id: productivityData._id,
          associateName: actualAssociateName,
          week: normalizedWeek,
          month: normalizedMonth,
          year: record.year
        });
        
        results.success.push(productivityData);
        
        // Store productivity data for email notification (grouped by team member)
        const teamMemberEmail = teamMember.email;
        if (!teamMemberProductivityMap.has(teamMemberEmail)) {
          teamMemberProductivityMap.set(teamMemberEmail, {
            teamMember: teamMember,
            productivityData: []
          });
        }
        teamMemberProductivityMap.get(teamMemberEmail).productivityData.push(productivityData);
      } catch (error) {
        console.error(`Error processing record ${i}:`, error);
        results.failed.push({ 
          index: i, 
          record, 
          error: error.message || 'Unknown error' 
        });
      }
    }

    // Send email notifications to team members
    // Send emails asynchronously so they don't block the response
    if (teamMemberProductivityMap.size > 0) {
      Promise.all(
        Array.from(teamMemberProductivityMap.values()).map(async ({ teamMember, productivityData }) => {
          try {
            await sendProductivityNotificationEmail(teamMember, productivityData);
          } catch (emailError) {
            console.error(`Failed to send email to ${teamMember.email}:`, emailError);
            // Don't fail the entire request if email fails
          }
        })
      ).catch(error => {
        console.error('Error sending productivity notification emails:', error);
      });
    }

    // Determine response status
    const allFailed = results.success.length === 0;
    const allSuccess = results.failed.length === 0;
    const statusCode = allFailed ? 400 : (allSuccess ? 201 : 207); // 207 = Multi-Status

    console.log(`Bulk upload completed: ${results.success.length} succeeded, ${results.failed.length} failed out of ${data.length} total records`);
    if (results.failed.length > 0) {
      console.log('Failed records:', results.failed.map(f => ({
        index: f.index,
        associateName: f.record?.associateName,
        error: f.error
      })));
    }

    res.status(statusCode).json({
      status: allSuccess ? 'success' : (allFailed ? 'error' : 'partial'),
      message: `Processed ${data.length} records. ${results.success.length} succeeded, ${results.failed.length} failed.`,
      results: {
        total: data.length,
        success: results.success.length,
        failed: results.failed.length,
        successRecords: results.success,
        failedRecords: results.failed
      }
    });
  } catch (error) {
    console.error('Error in bulk create:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Something went wrong while processing bulk upload!'
    });
  }
};

module.exports = {
  getAllProductivityData,
  getProductivityData,
  getMyProductivityData,
  createProductivityData,
  updateProductivityData,
  deleteProductivityData,
  getAggregatedTeamPerformance,
  getTopPerformers,
  getProductivityStats,
  getProductivityByWeek,
  getProductivityByMonth,
  getTeamMemberProductivityHistory,
  getPerformanceTrends,
  bulkCreateProductivityData
};
