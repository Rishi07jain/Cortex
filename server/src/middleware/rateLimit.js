/**
 * Minimal in-memory rate limiter - enough to blunt credential stuffing in
 * development without adding a dependency. Swap for express-rate-limit backed
 * by Redis before running more than one server process in production.
 */
function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, message } = {}) {
  const hits = new Map(); // ip -> { count, resetAt }

  // Keep the map from growing forever.
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs).unref();

  return function limiter(req, res, next) {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      res.status(429);
      return next(new Error(message || `Too many attempts. Try again in ${retryAfter}s.`));
    }

    return next();
  };
}

module.exports = rateLimit;