const TeamMember = require('../models/TeamMember');
const Manager = require('../models/Manager');

// Get all team members
const getAllTeamMembers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (req.query.managerId) {
      filter.managerId = req.query.managerId;
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
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const teamMembers = await TeamMember.find(filter)
      .populate('managerId', 'name email department')
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -loginAttempts -lockUntil')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await TeamMember.countDocuments(filter);

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

// Get team member by ID
const getTeamMember = async (req, res) => {
  try {
    const teamMember = await TeamMember.findById(req.params.id)
      .populate('managerId', 'name email department role')
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -loginAttempts -lockUntil');

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        teamMember
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get current team member profile
const getMe = async (req, res) => {
  try {
    const teamMember = await TeamMember.findById(req.user.id)
      .populate('managerId', 'name email department role')
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -loginAttempts -lockUntil');

    res.status(200).json({
      status: 'success',
      data: {
        teamMember
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Create team member
const createTeamMember = async (req, res) => {
  try {
    const { name, email, password, phone, managerId, da_id, workerId } = req.body;

    // Check if manager exists
    const manager = await Manager.findById(managerId);
    if (!manager) {
      return res.status(400).json({
        status: 'error',
        message: 'Manager not found'
      });
    }

    // Check if team member already exists
    const existingTeamMember = await TeamMember.findOne({ email });
    if (existingTeamMember) {
      return res.status(400).json({
        status: 'error',
        message: 'Team member with this email already exists'
      });
    }

    const teamMember = await TeamMember.create({
      name,
      email,
      password,
      phone,
      da_id,
      workerId,
      managerId
    });

    // Create email verification token
    const verificationToken = teamMember.createEmailVerificationToken();
    await teamMember.save({ validateBeforeSave: false });

    // In a real application, you would send this token via email
    console.log('Email verification token:', verificationToken);

    res.status(201).json({
      status: 'success',
      message: 'Team member created successfully',
      data: {
        teamMember: {
          id: teamMember._id,
          name: teamMember.name,
          email: teamMember.email,
          phone: teamMember.phone,
          da_id: teamMember.da_id,
          workerId: teamMember.workerId,
          managerId: teamMember.managerId,
          isActive: teamMember.isActive,
          isEmailVerified: teamMember.isEmailVerified,
          createdAt: teamMember.createdAt
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

// Update team member
const updateTeamMember = async (req, res) => {
  try {
    const { name, phone, managerId, da_id, workerId } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (da_id) updateData.da_id = da_id;
    if (workerId) updateData.workerId = workerId;
    if (managerId) {
      // Check if manager exists
      const manager = await Manager.findById(managerId);
      if (!manager) {
        return res.status(400).json({
          status: 'error',
          message: 'Manager not found'
        });
      }
      updateData.managerId = managerId;
    }

    const teamMember = await TeamMember.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('managerId', 'name email department role')
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -loginAttempts -lockUntil');

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Team member updated successfully',
      data: {
        teamMember
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update current team member profile
const updateMe = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;

    const teamMember = await TeamMember.findByIdAndUpdate(
      req.user.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('managerId', 'name email department role')
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -loginAttempts -lockUntil');

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        teamMember
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete team member
const deleteTeamMember = async (req, res) => {
  try {
    const teamMember = await TeamMember.findByIdAndDelete(req.params.id);

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Team member deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Deactivate team member
const deactivateTeamMember = async (req, res) => {
  try {
    const teamMember = await TeamMember.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    )
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -loginAttempts -lockUntil');

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Team member deactivated successfully',
      data: {
        teamMember
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Activate team member
const activateTeamMember = async (req, res) => {
  try {
    const teamMember = await TeamMember.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    )
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -loginAttempts -lockUntil');

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Team member activated successfully',
      data: {
        teamMember
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Get team members by manager
const getTeamMembersByManager = async (req, res) => {
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

// Get team member statistics
const getTeamMemberStats = async (req, res) => {
  try {
    const totalTeamMembers = await TeamMember.countDocuments();
    const activeTeamMembers = await TeamMember.countDocuments({ isActive: true });
    const verifiedTeamMembers = await TeamMember.countDocuments({ isEmailVerified: true });
    const recentTeamMembers = await TeamMember.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    res.status(200).json({
      status: 'success',
      data: {
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
  getAllTeamMembers,
  getTeamMember,
  getMe,
  createTeamMember,
  updateTeamMember,
  updateMe,
  deleteTeamMember,
  deactivateTeamMember,
  activateTeamMember,
  getTeamMembersByManager,
  getTeamMemberStats
};
