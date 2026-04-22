const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middleware/auth.middleware');

const {
  register,
  login,
  logout,
  refresh,
  forgotPassword,
  resetUserPassword,
  getMe
} = require('./auth.controller');

// public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetUserPassword);

router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

module.exports = router;