const crypto = require('crypto');
const TeamMember = require('../models/TeamMember');
const Manager = require('../models/Manager');
const { createSendToken } = require('../utils/jwt');

// Register User
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, managerId } = req.body;

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

    // Create team member
    const teamMember = await TeamMember.create({
      name,
      email,
      password,
      phone,
      managerId
    });

    // Create email verification token
    const verificationToken = teamMember.createEmailVerificationToken();
    await teamMember.save({ validateBeforeSave: false });

    // In a real application, you would send this token via email
    console.log('Email verification token:', verificationToken);

    createSendToken(teamMember, 201, res, 'Team member registered successfully. Please verify your email.');
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Register Manager
const registerManager = async (req, res) => {
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

    // Create manager
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

    createSendToken(manager, 201, res, 'Manager registered successfully. Please verify your email.');
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Login User
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password!'
      });
    }

    // 2) Check if team member exists && password is correct
    const teamMember = await TeamMember.findOne({ email }).select('+password');

    if (!teamMember || !(await teamMember.correctPassword(password, teamMember.password))) {
      // Increment login attempts
      if (teamMember) {
        await teamMember.incLoginAttempts();
      }
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password'
      });
    }

    // 3) Check if account is locked
    if (teamMember.isLocked) {
      return res.status(423).json({
        status: 'error',
        message: 'Account is locked due to too many failed login attempts. Please try again later.'
      });
    }

    // 4) Check if team member is active
    if (!teamMember.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // 5) Reset login attempts and update last login
    await teamMember.resetLoginAttempts();
    teamMember.lastLogin = new Date();
    await teamMember.save({ validateBeforeSave: false });

    // 6) If everything ok, send token to client
    createSendToken(teamMember, 200, res, 'Login successful');
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong!'
    });
  }
};

// Login Manager
const loginManager = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password!'
      });
    }

    // 2) Check if manager exists && password is correct
    const manager = await Manager.findOne({ email }).select('+password');

    if (!manager || !(await manager.correctPassword(password, manager.password))) {
      // Increment login attempts
      if (manager) {
        await manager.incLoginAttempts();
      }
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password'
      });
    }

    // 3) Check if account is locked
    if (manager.isLocked) {
      return res.status(423).json({
        status: 'error',
        message: 'Account is locked due to too many failed login attempts. Please try again later.'
      });
    }

    // 4) Check if manager is active
    if (!manager.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // 5) Reset login attempts and update last login
    await manager.resetLoginAttempts();
    manager.lastLogin = new Date();
    await manager.save({ validateBeforeSave: false });

    // 6) If everything ok, send token to client
    createSendToken(manager, 200, res, 'Login successful');
  } catch (error) {
    console.error('Manager login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong!'
    });
  }
};

// Forgot Password - Team Member
const forgotPasswordTeamMember = async (req, res) => {
  try {
    // 1) Get team member based on POSTed email
    const teamMember = await TeamMember.findOne({ email: req.body.email });
    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'There is no team member with email address.'
      });
    }

    // 2) Generate the random reset token
    const resetToken = teamMember.createPasswordResetToken();
    await teamMember.save({ validateBeforeSave: false });

    // 3) Send it to team member's email
    // In a real application, you would send this token via email
    console.log('Password reset token for team member:', resetToken);

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
      resetToken // Only for development - remove in production
    });
  } catch (error) {
    console.error('Forgot password team member error:', error);
    res.status(500).json({
      status: 'error',
      message: 'There was an error sending the email. Try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Forgot Password - Manager
const forgotPasswordManager = async (req, res) => {
  try {
    // 1) Get manager based on POSTed email
    const manager = await Manager.findOne({ email: req.body.email });
    if (!manager) {
      return res.status(404).json({
        status: 'error',
        message: 'There is no manager with email address.'
      });
    }

    // 2) Generate the random reset token
    const resetToken = manager.createPasswordResetToken();
    await manager.save({ validateBeforeSave: false });

    // 3) Send it to manager's email
    // In a real application, you would send this token via email
    console.log('Password reset token for manager:', resetToken);

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
      resetToken // Only for development - remove in production
    });
  } catch (error) {
    console.error('Forgot password manager error:', error);
    res.status(500).json({
      status: 'error',
      message: 'There was an error sending the email. Try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Reset Password - Team Member
const resetPasswordTeamMember = async (req, res) => {
  try {
    // 1) Get team member based on the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const teamMember = await TeamMember.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    // 2) If token has not expired, and there is team member, set the new password
    if (!teamMember) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is invalid or has expired'
      });
    }

    teamMember.password = req.body.password;
    teamMember.passwordResetToken = undefined;
    teamMember.passwordResetExpires = undefined;
    await teamMember.save();

    // 3) Update changedPasswordAt property for the team member
    // 4) Log the team member in, send JWT
    createSendToken(teamMember, 200, res, 'Password reset successful');
  } catch (error) {
    console.error('Reset password team member error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Password reset failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong!'
    });
  }
};

// Reset Password - Manager
const resetPasswordManager = async (req, res) => {
  try {
    // 1) Get manager based on the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const manager = await Manager.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    // 2) If token has not expired, and there is manager, set the new password
    if (!manager) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is invalid or has expired'
      });
    }

    manager.password = req.body.password;
    manager.passwordResetToken = undefined;
    manager.passwordResetExpires = undefined;
    await manager.save();

    // 3) Update changedPasswordAt property for the manager
    // 4) Log the manager in, send JWT
    createSendToken(manager, 200, res, 'Password reset successful');
  } catch (error) {
    console.error('Reset password manager error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Password reset failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong!'
    });
  }
};

// Update Password - Team Member
const updatePasswordTeamMember = async (req, res) => {
  try {
    // 1) Get team member from collection
    const teamMember = await TeamMember.findById(req.user.id).select('+password');

    // 2) Check if POSTed current password is correct
    if (!(await teamMember.correctPassword(req.body.passwordCurrent, teamMember.password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Your current password is wrong.'
      });
    }

    // 3) If so, update password
    teamMember.password = req.body.password;
    await teamMember.save();

    // 4) Log team member in, send JWT
    createSendToken(teamMember, 200, res, 'Password updated successfully');
  } catch (error) {
    console.error('Update password team member error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Password update failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong!'
    });
  }
};

// Update Password - Manager
const updatePasswordManager = async (req, res) => {
  try {
    // 1) Get manager from collection
    const manager = await Manager.findById(req.user.id).select('+password');

    // 2) Check if POSTed current password is correct
    if (!(await manager.correctPassword(req.body.passwordCurrent, manager.password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Your current password is wrong.'
      });
    }

    // 3) If so, update password
    manager.password = req.body.password;
    await manager.save();

    // 4) Log manager in, send JWT
    createSendToken(manager, 200, res, 'Password updated successfully');
  } catch (error) {
    console.error('Update password manager error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Password update failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong!'
    });
  }
};

// Verify Email - Team Member
const verifyEmailTeamMember = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const teamMember = await TeamMember.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!teamMember) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is invalid or has expired'
      });
    }

    teamMember.isEmailVerified = true;
    teamMember.emailVerificationToken = undefined;
    teamMember.emailVerificationExpires = undefined;
    await teamMember.save();

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Verify email team member error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Email verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong!'
    });
  }
};

// Verify Email - Manager
const verifyEmailManager = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const manager = await Manager.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!manager) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is invalid or has expired'
      });
    }

    manager.isEmailVerified = true;
    manager.emailVerificationToken = undefined;
    manager.emailVerificationExpires = undefined;
    await manager.save();

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Verify email manager error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Email verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong!'
    });
  }
};

// Logout
const logout = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
};

module.exports = {
  registerUser: registerUser,
  registerManager,
  loginUser: loginUser,
  loginManager,
  forgotPasswordUser: forgotPasswordTeamMember,
  forgotPasswordManager,
  resetPasswordUser: resetPasswordTeamMember,
  resetPasswordManager,
  updatePasswordUser: updatePasswordTeamMember,
  updatePasswordManager,
  verifyEmailUser: verifyEmailTeamMember,
  verifyEmailManager,
  logout
};
