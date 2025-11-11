const TeamMember = require('../models/TeamMember');
const Manager = require('../models/Manager');
const { sendVerificationEmail } = require('../utils/email');

// Get all team members
const getAllTeamMembers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10000; // High limit to get all records
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

    // Return response matching frontend expectations
    res.status(200).json({
      message: 'Team members fetched successfully',
      teamMembers: teamMembers,
      count: total
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({
      message: 'Failed to fetch team members',
      error: error.message
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
    const { name, email, password, managerId, da_id, workerId, department, position, isActive } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        message: 'Name and email are required'
      });
    }

    // Check if manager exists (if managerId provided)
    if (managerId) {
      const manager = await Manager.findById(managerId);
      if (!manager) {
        return res.status(400).json({
          message: 'Manager not found'
        });
      }
    }

    // Check if team member already exists
    const existingTeamMember = await TeamMember.findOne({ email });
    if (existingTeamMember) {
      return res.status(400).json({
        message: 'Team member with this email already exists'
      });
    }

    // Check if workerId already exists (if provided)
    if (workerId) {
      const existingTeamMemberWithWorkerId = await TeamMember.findOne({ workerId });
      if (existingTeamMemberWithWorkerId) {
        return res.status(400).json({
          message: 'Team member with this worker ID already exists'
        });
      }
    }

    // Check if da_id already exists (if provided)
    if (da_id) {
      const existingTeamMemberWithDaId = await TeamMember.findOne({ da_id });
      if (existingTeamMemberWithDaId) {
        return res.status(400).json({
          message: 'Team member with this DA ID already exists'
        });
      }
    }

    // Generate default password if not provided
    const defaultPassword = password || 'Password123!';

    const teamMemberData = {
      name,
      email,
      password: defaultPassword,
      workerId: workerId || '',
      department: department || '',
      position: position || '',
      managerId: managerId || req.user.id, // Use current user as manager if not provided
      isActive: isActive !== undefined ? isActive : true
    };

    // Only set da_id if explicitly provided, otherwise let middleware generate from email
    if (da_id) {
      teamMemberData.da_id = da_id;
    }

    const teamMember = await TeamMember.create(teamMemberData);

    // Create email verification token
    const verificationToken = teamMember.createEmailVerificationToken();
    await teamMember.save({ validateBeforeSave: false });

    // Send verification email to the team member with credentials
    try {
      await sendVerificationEmail(teamMember, verificationToken, defaultPassword);
    } catch (emailError) {
      // If email fails, log the error but don't prevent registration
      console.error('Failed to send verification email:', emailError);
      // We still continue with the registration process
    }

    res.status(201).json({
      message: 'Team member created successfully',
      teamMember: {
        _id: teamMember._id,
        name: teamMember.name,
        email: teamMember.email,
        da_id: teamMember.da_id,
        workerId: teamMember.workerId,
        managerId: teamMember.managerId,
        department: teamMember.department,
        position: teamMember.position,
        isActive: teamMember.isActive,
        isEmailVerified: teamMember.isEmailVerified,
        createdAt: teamMember.createdAt,
        updatedAt: teamMember.updatedAt
      }
    });
  } catch (error) {
    console.error('Error creating team member:', error);
    res.status(400).json({
      message: error.message
    });
  }
};

// Update team member
const updateTeamMember = async (req, res) => {
  try {
    const { name, email, managerId, da_id, workerId, department, position, isActive } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (department !== undefined) updateData.department = department;
    if (position !== undefined) updateData.position = position;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (da_id !== undefined) updateData.da_id = da_id;
    if (workerId !== undefined) updateData.workerId = workerId;
    if (managerId) {
      // Check if manager exists
      const manager = await Manager.findById(managerId);
      if (!manager) {
        return res.status(400).json({
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
        message: 'Team member not found'
      });
    }

    res.status(200).json({
      message: 'Team member updated successfully',
      teamMember: teamMember
    });
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
};

// Update current team member profile
const updateMe = async (req, res) => {
  try {
    const { name } = req.body;
    const updateData = {};

    if (name) updateData.name = name;

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
        message: 'Team member not found'
      });
    }

    res.status(200).json({
      message: 'Team member deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting team member:', error);
    res.status(500).json({
      message: 'Failed to delete team member'
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
