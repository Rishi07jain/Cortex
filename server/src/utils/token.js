const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'ic_token';

/**
 * Turns "30d" / "12h" / "45m" / "3600" into milliseconds so the cookie and the
 * token always expire together. Falls back to 30 days on anything unexpected.
 */
function parseDuration(value, fallbackMs = 30 * 24 * 60 * 60 * 1000) {
  if (!value) return fallbackMs;

  const match = String(value).trim().match(/^(\d+)\s*(ms|s|m|h|d)?$/i);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase(); // bare numbers are seconds, per jsonwebtoken
  const multipliers = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };

  return amount * multipliers[unit];
}

function tokenTtlMs() {
  return parseDuration(process.env.JWT_EXPIRES_IN);
}

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: Math.floor(tokenTtlMs() / 1000), // seconds
  });
}

/**
 * Sends the JWT as an httpOnly cookie. localhost:3000 and localhost:5001 count as
 * the same site (ports are not part of a "site"), so sameSite 'lax' works in dev;
 * in production behind HTTPS we switch to 'none' + secure so the cookie survives
 * a cross-origin deploy.
 */
function sendTokenCookie(res, userId) {
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie(COOKIE_NAME, signToken(userId), {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: tokenTtlMs(),
    path: '/',
  });
}

function clearTokenCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie(COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    expires: new Date(0),
    path: '/',
  });
}

module.exports = { signToken, sendTokenCookie, clearTokenCookie, tokenTtlMs, COOKIE_NAME };