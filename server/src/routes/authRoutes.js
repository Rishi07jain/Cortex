const express = require('express');
const { register, login, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

// Credential endpoints get a modest cap per IP.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
});

router.post('/register', credentialLimiter, register);
router.post('/login', credentialLimiter, login);
router.post('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;