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

module.exports = {
  getDashboardStats,
  getRecentActivities
};

