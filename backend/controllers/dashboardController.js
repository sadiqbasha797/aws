const SOP = require('../models/SOP');
const TeamMember = require('../models/TeamMember');
const Manager = require('../models/Manager');
const ProductivityData = require('../models/ProductivityData');
const ReliabilityData = require('../models/ReliabilityData');
const Bin = require('../models/Bin');

/**
 * Get dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    const user = req.user;
    const isManager = user.role === 'manager';

    // Get SOP statistics
    const totalSOPs = await SOP.countDocuments({ isDeleted: false });
    const activeSOPs = await SOP.countDocuments({ isDeleted: false });
    const recentSOPs = await SOP.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdAt createdBy')
      .lean();

    // Get Team Member statistics
    const totalTeamMembers = await TeamMember.countDocuments({ isActive: true });
    const inactiveTeamMembers = await TeamMember.countDocuments({ isActive: false });
    const totalMembers = totalTeamMembers + inactiveTeamMembers;

    // Get Manager statistics
    const totalManagers = await Manager.countDocuments();

    // Get Productivity statistics
    const productivityStats = await ProductivityData.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          avgProductivity: { $avg: '$productivityPercentage' },
          maxProductivity: { $max: '$productivityPercentage' },
          minProductivity: { $min: '$productivityPercentage' }
        }
      }
    ]);
    const productivityResult = productivityStats[0] || { totalRecords: 0, avgProductivity: 0, maxProductivity: 0, minProductivity: 0 };

    // Get Reliability statistics
    const reliabilityStats = await ReliabilityData.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          avgReliabilityScore: { $avg: '$overallReliabilityScore' },
          maxReliabilityScore: { $max: '$overallReliabilityScore' },
          minReliabilityScore: { $min: '$overallReliabilityScore' }
        }
      }
    ]);
    const reliabilityResult = reliabilityStats[0] || { totalRecords: 0, avgReliabilityScore: 0, maxReliabilityScore: 0, minReliabilityScore: 0 };

    // Get Bin statistics
    const binItemsCount = await Bin.countDocuments({ isRestored: false });

    // Get recent activities (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Recent SOPs created
    const recentSOPsCreated = await SOP.find({
      isDeleted: false,
      createdAt: { $gte: sevenDaysAgo }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title createdAt createdBy')
      .lean();

    // Manager-specific stats
    let managerStats = {};
    if (isManager) {
      const managerProductivity = await ProductivityData.aggregate([
        { $match: { teamManager: user.name.toLowerCase(), isActive: true } },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            avgProductivity: { $avg: '$productivityPercentage' }
          }
        }
      ]);

      const managerReliability = await ReliabilityData.aggregate([
        { $match: { managerId: user.name.toLowerCase(), isActive: true } },
        {
          $group: {
            _id: null,
            totalWorkers: { $sum: 1 },
            avgReliabilityScore: { $avg: '$overallReliabilityScore' }
          }
        }
      ]);

      const mySOPs = await SOP.countDocuments({
        'createdBy.userId': user._id,
        isDeleted: false
      });

      managerStats = {
        mySOPs,
        productivityRecords: managerProductivity[0]?.totalRecords || 0,
        avgProductivity: managerProductivity[0]?.avgProductivity || 0,
        reliabilityWorkers: managerReliability[0]?.totalWorkers || 0,
        avgReliability: managerReliability[0]?.avgReliabilityScore || 0
      };
    }

    res.status(200).json({
      message: 'Dashboard statistics retrieved successfully',
      stats: {
        sops: {
          total: totalSOPs,
          active: activeSOPs,
          recent: recentSOPs
        },
        teamMembers: {
          total: totalMembers,
          active: totalTeamMembers,
          inactive: inactiveTeamMembers
        },
        managers: {
          total: totalManagers
        },
        productivity: {
          totalRecords: productivityResult.totalRecords,
          avgProductivity: productivityResult.avgProductivity || 0,
          maxProductivity: productivityResult.maxProductivity || 0,
          minProductivity: productivityResult.minProductivity || 0
        },
        reliability: {
          totalRecords: reliabilityResult.totalRecords,
          avgReliabilityScore: reliabilityResult.avgReliabilityScore || 0,
          maxReliabilityScore: reliabilityResult.maxReliabilityScore || 0,
          minReliabilityScore: reliabilityResult.minReliabilityScore || 0
        },
        bin: {
          itemsInBin: binItemsCount
        },
        recentActivities: recentSOPsCreated.map(sop => ({
          type: 'sop_created',
          title: sop.title,
          createdAt: sop.createdAt,
          createdBy: sop.createdBy?.name || 'Unknown'
        })),
        managerStats: isManager ? managerStats : null
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve dashboard statistics',
      details: error.message
    });
  }
};

/**
 * Get recent activities
 */
const getRecentActivities = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activities = [];

    // Recent SOPs
    const recentSOPs = await SOP.find({
      isDeleted: false,
      createdAt: { $gte: sevenDaysAgo }
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('title createdAt createdBy updatedAt updatedBy')
      .lean();

    recentSOPs.forEach(sop => {
      activities.push({
        type: 'sop_created',
        icon: 'document',
        color: 'orange',
        title: `SOP "${sop.title}" created`,
        description: `Created by ${sop.createdBy?.name || 'Unknown'}`,
        timestamp: sop.createdAt
      });

      if (sop.updatedAt && sop.updatedAt > sop.createdAt) {
        activities.push({
          type: 'sop_updated',
          icon: 'edit',
          color: 'blue',
          title: `SOP "${sop.title}" updated`,
          description: `Updated by ${sop.updatedBy?.name || 'Unknown'}`,
          timestamp: sop.updatedAt
        });
      }
    });

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    activities.splice(parseInt(limit));

    res.status(200).json({
      message: 'Recent activities retrieved successfully',
      activities
    });
  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({
      error: 'Failed to retrieve recent activities',
      details: error.message
    });
  }
};

/**
 * Get month-wise reliability data for the last 5 months
 */
const getReliabilityMonthlyData = async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

    // Calculate date ranges for the last 5 months
    const monthsData = [];
    for (let i = 4; i >= 0; i--) {
      let month = currentMonth - i;
      let year = currentYear;
      
      // Handle year rollover
      if (month <= 0) {
        month += 12;
        year -= 1;
      }

      // Calculate start and end of month
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

      // Get reliability data for this month - using createdAt if month/year fields are not available
      const monthStats = await ReliabilityData.aggregate([
        {
          $match: {
            isActive: true,
            $or: [
              { year: year, month: month },
              {
                createdAt: {
                  $gte: monthStart,
                  $lte: monthEnd
                }
              }
            ]
          }
        },
        {
          $group: {
            _id: null,
            avgReliabilityScore: { $avg: '$overallReliabilityScore' },
            count: { $sum: 1 }
          }
        }
      ]);

      const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'short' });
      const avgScore = monthStats.length > 0 ? monthStats[0].avgReliabilityScore : 0;
      const count = monthStats.length > 0 ? monthStats[0].count : 0;

      monthsData.push({
        month: monthName,
        monthNumber: month,
        year: year,
        avgReliabilityScore: Math.round(avgScore * 100) / 100,
        recordCount: count
      });
    }

    res.status(200).json({
      message: 'Monthly reliability data retrieved successfully',
      data: monthsData
    });
  } catch (error) {
    console.error('Monthly reliability data error:', error);
    res.status(500).json({
      error: 'Failed to retrieve monthly reliability data',
      details: error.message
    });
  }
};

/**
 * Get week-wise productivity data for the last 5 weeks
 */
const getProductivityWeeklyData = async (req, res) => {
  try {
    const now = new Date();
    
    // Helper function to get week number from date (ISO week)
    const getWeekNumber = (date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    // Helper function to get start and end of week (Monday to Sunday)
    const getWeekRange = (date, weekOffset = 0) => {
      const d = new Date(date);
      d.setDate(d.getDate() - (weekOffset * 7));
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const weekStart = new Date(d.getFullYear(), d.getMonth(), diff);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const weekNum = getWeekNumber(weekStart);
      return { weekStart, weekEnd, weekNumber: weekNum, year: weekStart.getFullYear() };
    };

    // Calculate the last 5 weeks
    const weeksData = [];
    for (let i = 4; i >= 0; i--) {
      const { weekStart, weekEnd, weekNumber, year } = getWeekRange(now, i);

      // Get productivity data for this week - using createdAt if weekNumber/year fields are not available
      const weekStats = await ProductivityData.aggregate([
        {
          $match: {
            isActive: true,
            $or: [
              { year: year, weekNumber: weekNumber },
              {
                createdAt: {
                  $gte: weekStart,
                  $lte: weekEnd
                }
              }
            ]
          }
        },
        {
          $group: {
            _id: null,
            avgProductivity: { $avg: '$productivityPercentage' },
            count: { $sum: 1 }
          }
        }
      ]);

      const avgProductivity = weekStats.length > 0 ? weekStats[0].avgProductivity : 0;
      const count = weekStats.length > 0 ? weekStats[0].count : 0;

      weeksData.push({
        week: `Week ${weekNumber}`,
        weekNumber: weekNumber,
        year: year,
        avgProductivity: Math.round(avgProductivity * 100) / 100,
        recordCount: count
      });
    }

    res.status(200).json({
      message: 'Weekly productivity data retrieved successfully',
      data: weeksData
    });
  } catch (error) {
    console.error('Weekly productivity data error:', error);
    res.status(500).json({
      error: 'Failed to retrieve weekly productivity data',
      details: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivities,
  getReliabilityMonthlyData,
  getProductivityWeeklyData
};

