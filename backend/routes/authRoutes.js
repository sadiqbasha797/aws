const express = require('express');
const {
  registerUser,
  registerManager,
  loginUser,
  loginManager,
  forgotPasswordUser,
  forgotPasswordManager,
  resetPasswordUser,
  resetPasswordManager,
  updatePasswordUser,
  updatePasswordManager,
  verifyEmailUser,
  verifyEmailManager,
  logout
} = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/register/user', registerUser);
router.post('/register/manager', registerManager);
router.post('/login/user', loginUser);
router.post('/login/manager', loginManager);
router.post('/forgot-password/user', forgotPasswordUser);
router.post('/forgot-password/manager', forgotPasswordManager);
router.patch('/reset-password/user/:token', resetPasswordUser);
router.patch('/reset-password/manager/:token', resetPasswordManager);
router.get('/verify-email/user/:token', verifyEmailUser);
router.get('/verify-email/manager/:token', verifyEmailManager);
router.post('/logout', logout);

module.exports = router;
