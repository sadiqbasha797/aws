const jwt = require('jsonwebtoken');

const signToken = (id, role = 'user') => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d'
  });
};

const createSendToken = (user, statusCode, res, message = 'Success') => {
  const token = signToken(user._id, user.role || 'user');
  
  // Remove password from output
  user.password = undefined;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  user.loginAttempts = undefined;
  user.lockUntil = undefined;

  res.status(statusCode).json({
    status: 'success',
    message,
    token,
    data: {
      user
    }
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
  signToken,
  createSendToken,
  verifyToken
};
