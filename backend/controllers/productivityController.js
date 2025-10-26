const ProductivityData = require('../models/ProductivityData');
const TeamMember = require('../models/TeamMember');

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
      associateName: req.user.name,
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

    // Check if team member exists
    const teamMember = await TeamMember.findOne({ name: associateName });
    if (!teamMember) {
      return res.status(400).json({
        status: 'error',
        message: 'Team member with this name does not exist'
      });
    }

    // Extract week number from week string
    const weekNumber = week ? parseInt(week.replace('Week ', '')) : null;

    // Check if productivity data already exists for this associate and week
    const existingData = await ProductivityData.findOne({
      associateName,
      teamManager: teamManager || req.user.managerId || req.user._id.toString(),
      year: year || new Date().getFullYear(),
      week: week || `Week ${new Date().getWeek()}`,
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
      associateName,
      month: month || new Date().toLocaleString('default', { month: 'long' }),
      week: week || `Week ${new Date().getWeek()}`,
      productivityPercentage,
      year: year || new Date().getFullYear(),
      weekNumber: weekNumber || new Date().getWeek(),
      notes
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

    // Check if team member exists
    const teamMember = await TeamMember.findOne({ name: associateName });
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
  getPerformanceTrends
};
