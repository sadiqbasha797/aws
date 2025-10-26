const ReliabilityData = require('../models/ReliabilityData');
const TeamMember = require('../models/TeamMember');

// Get all reliability data (Manager only)
const getAllReliabilityData = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { isActive: true };
    
    // If user is a manager, filter by their managerId
    if (req.userRole === 'manager') {
      filter.managerId = req.user.managerId || req.user._id.toString();
    }

    if (req.query.workerId) {
      filter.workerId = req.query.workerId;
    }
    if (req.query.daId) {
      filter.daId = { $regex: req.query.daId, $options: 'i' };
    }
    if (req.query.managerId) {
      filter.managerId = req.query.managerId;
    }
    if (req.query.minScore) {
      filter.overallReliabilityScore = { $gte: parseFloat(req.query.minScore) };
    }
    if (req.query.maxScore) {
      filter.overallReliabilityScore = { 
        ...filter.overallReliabilityScore, 
        $lte: parseFloat(req.query.maxScore) 
      };
    }
    if (req.query.year) {
      filter.year = parseInt(req.query.year);
    }
    if (req.query.month) {
      filter.month = parseInt(req.query.month);
    }
    if (req.query.search) {
      filter.$or = [
        { workerId: { $regex: req.query.search, $options: 'i' } },
        { daId: { $regex: req.query.search, $options: 'i' } },
        { managerId: { $regex: req.query.search, $options: 'i' } },
        { processname: { $regex: req.query.search, $options: 'i' } },
        { job_id: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const reliabilityData = await ReliabilityData.find(filter)
      .sort({ overallReliabilityScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ReliabilityData.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: reliabilityData.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        reliabilityData
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get reliability data by ID
const getReliabilityData = async (req, res) => {
  try {
    const reliabilityData = await ReliabilityData.findById(req.params.id);

    if (!reliabilityData) {
      return res.status(404).json({
        status: 'error',
        message: 'Reliability data not found'
      });
    }

    // Check access permissions
    if (req.userRole === 'team_member') {
      // User can only access their own data
      if (reliabilityData.daId !== req.user.da_id) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You can only view your own data.'
        });
      }
    } else if (req.userRole === 'manager') {
      // Manager can only access data from their team
      if (reliabilityData.managerId !== (req.user.managerId || req.user._id.toString())) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You can only view data from your team.'
        });
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        reliabilityData
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get current user's reliability data
const getMyReliabilityData = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { 
      daId: req.user.da_id,
      isActive: true 
    };

    if (req.query.year) {
      filter.year = parseInt(req.query.year);
    }
    if (req.query.month) {
      filter.month = parseInt(req.query.month);
    }

    const reliabilityData = await ReliabilityData.find(filter)
      .sort({ year: -1, month: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ReliabilityData.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: reliabilityData.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        reliabilityData
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Create reliability data (Manager only)
const createReliabilityData = async (req, res) => {
  try {
    const {
      workerId,
      daId,
      managerId,
      processname,
      job_id,
      totalTasks,
      totalOpportunities,
      totalSegmentsMatching,
      totalLabelMatching,
      totalDefects,
      overallReliabilityScore,
      period,
      month,
      year
    } = req.body;

    // Check if team member with daId exists (case-insensitive search)
    const teamMember = await TeamMember.findOne({ 
      da_id: { $regex: new RegExp(`^${daId}$`, 'i') }
    });
    if (!teamMember) {
      return res.status(400).json({
        status: 'error',
        message: 'Team member with this DA ID does not exist'
      });
    }

    // Check if worker already has data for this period
    const existingData = await ReliabilityData.findOne({
      workerId,
      year: year || new Date().getFullYear(),
      month: month || new Date().getMonth() + 1,
      isActive: true
    });

    if (existingData) {
      return res.status(400).json({
        status: 'error',
        message: 'Reliability data for this worker already exists for this period'
      });
    }

    const reliabilityData = await ReliabilityData.create({
      workerId,
      daId,
      managerId: managerId || req.user.managerId || req.user._id.toString(),
      processname,
      job_id,
      totalTasks,
      totalOpportunities,
      totalSegmentsMatching,
      totalLabelMatching,
      totalDefects,
      overallReliabilityScore,
      period: period || 'monthly',
      month: month || new Date().getMonth() + 1,
      year: year || new Date().getFullYear()
    });

    res.status(201).json({
      status: 'success',
      message: 'Reliability data created successfully',
      data: {
        reliabilityData
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Worker ID already exists'
      });
    }
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update reliability data (Manager only)
const updateReliabilityData = async (req, res) => {
  try {
    const {
      processname,
      job_id,
      totalTasks,
      totalOpportunities,
      totalSegmentsMatching,
      totalLabelMatching,
      totalDefects,
      overallReliabilityScore,
      period,
      month,
      year
    } = req.body;

    const updateData = {};
    if (processname !== undefined) updateData.processname = processname;
    if (job_id !== undefined) updateData.job_id = job_id;
    if (totalTasks !== undefined) updateData.totalTasks = totalTasks;
    if (totalOpportunities !== undefined) updateData.totalOpportunities = totalOpportunities;
    if (totalSegmentsMatching !== undefined) updateData.totalSegmentsMatching = totalSegmentsMatching;
    if (totalLabelMatching !== undefined) updateData.totalLabelMatching = totalLabelMatching;
    if (totalDefects !== undefined) updateData.totalDefects = totalDefects;
    if (overallReliabilityScore !== undefined) updateData.overallReliabilityScore = overallReliabilityScore;
    if (period) updateData.period = period;
    if (month) updateData.month = month;
    if (year) updateData.year = year;

    const reliabilityData = await ReliabilityData.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!reliabilityData) {
      return res.status(404).json({
        status: 'error',
        message: 'Reliability data not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Reliability data updated successfully',
      data: {
        reliabilityData
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete reliability data (Manager only)
const deleteReliabilityData = async (req, res) => {
  try {
    const reliabilityData = await ReliabilityData.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!reliabilityData) {
      return res.status(404).json({
        status: 'error',
        message: 'Reliability data not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Reliability data deleted successfully'
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
    const managerId = req.user.managerId || req.user._id.toString();

    // Build match criteria
    const matchCriteria = { managerId, isActive: true };
    
    if (req.query.year) {
      matchCriteria.year = parseInt(req.query.year);
    }
    if (req.query.month) {
      matchCriteria.month = parseInt(req.query.month);
    }
    if (req.query.search) {
      matchCriteria.$or = [
        { daId: { $regex: req.query.search, $options: 'i' } },
        { processname: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const aggregatedData = await ReliabilityData.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: '$daId',
          daId: { $first: '$daId' },
          avgReliabilityScore: { $avg: '$overallReliabilityScore' },
          avgSegmentAccuracy: { $avg: '$segmentAccuracy' },
          avgLabelAccuracy: { $avg: '$labelAccuracy' },
          avgDefectRate: { $avg: '$defectRate' },
          totalTasks: { $sum: '$totalTasks' },
          totalOpportunities: { $sum: '$totalOpportunities' },
          totalDefects: { $sum: '$totalDefects' },
          recordCount: { $sum: 1 },
          latestRecord: { $max: '$createdAt' },
          processes: { $addToSet: '$processname' }
        }
      },
      { $sort: { avgReliabilityScore: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          daId: 1,
          overallReliabilityScore: { $round: ['$avgReliabilityScore', 2] },
          segmentAccuracy: { $round: ['$avgSegmentAccuracy', 2] },
          labelAccuracy: { $round: ['$avgLabelAccuracy', 2] },
          defectRate: { $round: ['$avgDefectRate', 2] },
          totalTasks: 1,
          totalOpportunities: 1,
          totalDefects: 1,
          recordCount: 1,
          latestRecord: 1,
          processes: 1
        }
      }
    ]);

    // Get total count for pagination
    const totalCount = await ReliabilityData.aggregate([
      { $match: matchCriteria },
      { $group: { _id: '$daId' } },
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
        reliabilityData: aggregatedData
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
    const managerId = req.user.managerId || req.user._id.toString();

    const topPerformers = await ReliabilityData.getTopPerformers(managerId, limit);

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

// Get performance statistics (Manager only)
const getPerformanceStats = async (req, res) => {
  try {
    const managerId = req.user.managerId || req.user._id.toString();
    const stats = await ReliabilityData.getPerformanceStats(managerId);

    res.status(200).json({
      status: 'success',
      data: {
        stats: stats[0] || {
          totalWorkers: 0,
          avgReliabilityScore: 0,
          maxReliabilityScore: 0,
          minReliabilityScore: 0,
          totalTasks: 0,
          totalOpportunities: 0,
          totalDefects: 0,
          avgSegmentAccuracy: 0,
          avgLabelAccuracy: 0,
          avgDefectRate: 0
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

// Get user's performance history
const getUserPerformanceHistory = async (req, res) => {
  try {
    const daId = req.params.daId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Check if user exists
    const user = await User.findOne({ da_id: daId });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check access permissions
    if (req.userRole === 'team_member' && req.user.da_id !== daId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only view your own performance history.'
      });
    }

    if (req.userRole === 'manager' && teamMember.managerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only view performance history of your team members.'
      });
    }

    const performanceHistory = await ReliabilityData.find({
      daId,
      isActive: true
    })
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ReliabilityData.countDocuments({
      daId,
      isActive: true
    });

    res.status(200).json({
      status: 'success',
      results: performanceHistory.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        user: {
          da_id: user.da_id,
          name: user.name,
          email: user.email
        },
        performanceHistory
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get performance by period
const getPerformanceByPeriod = async (req, res) => {
  try {
    const { year, month } = req.params;
    const managerId = req.user.managerId || req.user._id.toString();

    const performanceData = await ReliabilityData.find({
      managerId,
      year: parseInt(year),
      month: parseInt(month),
      isActive: true
    }).sort({ overallReliabilityScore: -1 });

    res.status(200).json({
      status: 'success',
      results: performanceData.length,
      data: {
        period: { year: parseInt(year), month: parseInt(month) },
        performanceData
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
  getAllReliabilityData,
  getReliabilityData,
  getMyReliabilityData,
  createReliabilityData,
  updateReliabilityData,
  deleteReliabilityData,
  getAggregatedTeamPerformance,
  getTopPerformers,
  getPerformanceStats,
  getUserPerformanceHistory,
  getPerformanceByPeriod
};
