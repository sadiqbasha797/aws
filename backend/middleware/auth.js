const jwt = require('jsonwebtoken');
const TeamMember = require('../models/TeamMember');
const Manager = require('../models/Manager');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    // 1) Getting token and check if it's there
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    // 2) Verification token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    let currentUser;
    if (decoded.role === 'manager') {
      currentUser = await Manager.findById(decoded.id);
    } else {
      currentUser = await TeamMember.findById(decoded.id);
    }

    if (!currentUser) {
      return res.status(401).json({
        status: 'error',
        message: 'The user belonging to this token does no longer exist.'
      });
    }

    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: 'error',
        message: 'User recently changed password! Please log in again.'
      });
    }

    // 5) Check if account is locked
    if (currentUser.isLocked) {
      return res.status(423).json({
        status: 'error',
        message: 'Account is locked due to too many failed login attempts. Please try again later.'
      });
    }

    // Grant access to protected route
    req.user = currentUser;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token. Please log in again!'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Your token has expired! Please log in again.'
      });
    }
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

// Restrict to certain roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Check if user is active
const checkActive = (req, res, next) => {
  if (!req.user.isActive) {
    return res.status(403).json({
      status: 'error',
      message: 'Your account has been deactivated. Please contact support.'
    });
  }
  next();
};

// Check if email is verified
const checkEmailVerified = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      status: 'error',
      message: 'Please verify your email address before accessing this resource.'
    });
  }
  next();
};

module.exports = {
  protect,
  restrictTo,
  checkActive,
  checkEmailVerified
};
