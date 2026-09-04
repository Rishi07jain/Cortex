const jwt = require('jsonwebtoken');
const asyncHandler = require('./asyncHandler');
const User = require('../models/User');
const { COOKIE_NAME } = require('../utils/token');

/**
 * Populates req.user from the httpOnly cookie (or an Authorization: Bearer
 * header, which is handy for curl/Postman testing).
 */
const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.[COOKIE_NAME];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorised - please sign in');
  }

  // Verify the signature first. Keep the DB lookup outside the try/catch so a
  // "user deleted" case doesn't get reported as "invalid token".
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error('Not authorised - invalid or expired session');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    res.status(401);
    throw new Error('Not authorised - user no longer exists');
  }

  req.user = user;
  return next();
});

module.exports = { protect };