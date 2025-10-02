const Manager = require('../models/Manager');
const TeamMember = require('../models/TeamMember');

// Get all managers
const getAllManagers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (req.query.department) {
      filter.department = { $regex: req.query.department, $options: 'i' };
    }
    if (req.query.role) {
      filter.role = req.query.role;
    }
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    if (req.query.isEmailVerified !== undefined) {
      filter.isEmailVerified = req.query.isEmailVerified === 'true';
    }
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { department: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const managers = await Manager.find(filter)
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -loginAttempts -lockUntil')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Manager.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: managers.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        managers
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get manager by ID
const getManager = async (req, res) => {
  try {
    const manager = await Manager.findById(req.params.id)
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -loginAttempts -lockUntil');

    if (!manager) {
      return res.status(404).json({
        status: 'error',
        message: 'Manager not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        manager
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get current manager profile
const getMe = async (req, res) => {
  try {
    const manager = await Manager.findById(req.user.id)
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -loginAttempts -lockUntil');

    res.status(200).json({
      status: 'success',
      data: {
        manager
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Create manager
const createManager = async (req, res) => {
  try {
    const { name, email, password, department, role } = req.body;

    // Check if manager already exists
    const existingManager = await Manager.findOne({ email });
    if (existingManager) {
      return res.status(400).json({
        status: 'error',
        message: 'Manager with this email already exists'
      });
    }

    const manager = await Manager.create({
      name,
      email,
      password,
      department,
      role
    });

    // Create email verification token
    const verificationToken = manager.createEmailVerificationToken();
    await manager.save({ validateBeforeSave: false });

    // In a real application, you would send this token via email
    console.log('Email verification token:', verificationToken);

    res.status(201).json({
      status: 'success',
      message: 'Manager created successfully',
      data: {
        manager: {
          id: manager._id,
          name: manager.name,
          email: manager.email,
          department: manager.department,
          role: manager.role,
          isActive: manager.isActive,
          isEmailVerified: manager.isEmailVerified,
          createdAt: manager.createdAt
        }
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update manager
const updateManager = async (req, res) => {
  try {
    const { name, department, role } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (department) updateData.department = department;
    if (role) updateData.role = role;

    const manager = await Manager.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -loginAttempts -lockUntil');

    if (!manager) {
      return res.status(404).json({
        status: 'error',
        message: 'Manager not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Manager updated successfully',
      data: {
        manager
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update current manager profile
const updateMe = async (req, res) => {
  try {
    const { name, department, role } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (department) updateData.department = department;
    if (role) updateData.role = role;

    const manager = await Manager.findByIdAndUpdate(
      req.user.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -loginAttempts -lockUntil');

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        manager
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete manager
const deleteManager = async (req, res) => {
  try {
    const managerId = req.params.id;

    // Check if manager has any team members
    const teamMemberCount = await TeamMember.countDocuments({ managerId });
    if (teamMemberCount > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete manager. ${teamMemberCount} team member(s) are assigned to this manager. Please reassign team members first.`
      });
    }

    const manager = await Manager.findByIdAndDelete(managerId);

    if (!manager) {
      return res.status(404).json({
        status: 'error',
        message: 'Manager not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Manager deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Deactivate manager
const deactivateManager = async (req, res) => {
  try {
    const manager = await Manager.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    )
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -loginAttempts -lockUntil');

    if (!manager) {
      return res.status(404).json({
        status: 'error',
        message: 'Manager not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Manager deactivated successfully',
      data: {
        manager
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Activate manager
const activateManager = async (req, res) => {
  try {
    const manager = await Manager.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    )
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -loginAttempts -lockUntil');

    if (!manager) {
      return res.status(404).json({
        status: 'error',
        message: 'Manager not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Manager activated successfully',
      data: {
        manager
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get manager's team members
const getManagerTeamMembers = async (req, res) => {
  try {
    const managerId = req.params.managerId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if manager exists
    const manager = await Manager.findById(managerId);
    if (!manager) {
      return res.status(404).json({
        status: 'error',
        message: 'Manager not found'
      });
    }

    const teamMembers = await TeamMember.find({ managerId })
      .populate('managerId', 'name email department role')
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -loginAttempts -lockUntil')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await TeamMember.countDocuments({ managerId });

    res.status(200).json({
      status: 'success',
      results: teamMembers.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        teamMembers
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get manager statistics
const getManagerStats = async (req, res) => {
  try {
    const totalManagers = await Manager.countDocuments();
    const activeManagers = await Manager.countDocuments({ isActive: true });
    const verifiedManagers = await Manager.countDocuments({ isEmailVerified: true });
    const recentManagers = await Manager.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    // Get department statistics
    const departmentStats = await Manager.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get role statistics
    const roleStats = await Manager.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalManagers,
          activeManagers,
          inactiveManagers: totalManagers - activeManagers,
          verifiedManagers,
          unverifiedManagers: totalManagers - verifiedManagers,
          recentManagers
        },
        departmentStats,
        roleStats
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get specific manager's statistics
const getManagerSpecificStats = async (req, res) => {
  try {
    const managerId = req.params.managerId;

    // Check if manager exists
    const manager = await Manager.findById(managerId);
    if (!manager) {
      return res.status(404).json({
        status: 'error',
        message: 'Manager not found'
      });
    }

    const totalTeamMembers = await TeamMember.countDocuments({ managerId });
    const activeTeamMembers = await TeamMember.countDocuments({ managerId, isActive: true });
    const verifiedTeamMembers = await TeamMember.countDocuments({ managerId, isEmailVerified: true });
    const recentTeamMembers = await TeamMember.countDocuments({
      managerId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    res.status(200).json({
      status: 'success',
      data: {
        manager: {
          id: manager._id,
          name: manager.name,
          email: manager.email,
          department: manager.department,
          role: manager.role
        },
        stats: {
          totalTeamMembers,
          activeTeamMembers,
          inactiveTeamMembers: totalTeamMembers - activeTeamMembers,
          verifiedTeamMembers,
          unverifiedTeamMembers: totalTeamMembers - verifiedTeamMembers,
          recentTeamMembers
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

module.exports = {
  getAllManagers,
  getManager,
  getMe,
  createManager,
  updateManager,
  updateMe,
  deleteManager,
  deactivateManager,
  activateManager,
  getManagerTeamMembers,
  getManagerStats,
  getManagerSpecificStats
};
