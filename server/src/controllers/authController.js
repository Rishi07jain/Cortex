const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const { sendTokenCookie, clearTokenCookie } = require('../utils/token');

// @desc   Register a new user
// @route  POST /api/auth/register
// @access Public
const register = asyncHandler(async (req, res) => {
  const { name, password } = req.body;
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are all required');
  }

  const exists = await User.findOne({ email });
  if (exists) {
    res.status(409);
    throw new Error('An account with that email already exists');
  }

  const user = await User.create({ name, email, password });

  // Give every new account a workspace so the dashboard is never empty.
  await Workspace.create({
    name: 'My workspace',
    description: 'Your default workspace',
    owner: user._id,
  });

  sendTokenCookie(res, user._id);
  res.status(201).json(user.toPublicJSON());
});

// @desc   Log in
// @route  POST /api/auth/login
// @access Public
const login = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  // password has select:false on the schema, so ask for it explicitly
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  sendTokenCookie(res, user._id);
  res.json(user.toPublicJSON());
});

// @desc   Log out
// @route  POST /api/auth/logout
// @access Public
const logout = asyncHandler(async (req, res) => {
  clearTokenCookie(res);
  res.json({ message: 'Signed out' });
});

// @desc   Current user
// @route  GET /api/auth/me
// @access Private
const getMe = asyncHandler(async (req, res) => {
  res.json(req.user.toPublicJSON());
});

module.exports = { register, login, logout, getMe };