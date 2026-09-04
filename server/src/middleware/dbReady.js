const mongoose = require('mongoose');

// mongoose.connection.readyState is an integer; these are its meanings.
const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

/** Human-readable connection state, for the health endpoint. */
function dbState() {
  return STATES[mongoose.connection.readyState] ?? 'unknown';
}

/**
 * Blocks data routes while MongoDB is unavailable.
 *
 * Two failure modes this replaces, both of which are miserable to debug:
 *   1. The process exits on a DB error, nothing listens on the port, and the
 *      browser reports "CORS Failed" - because a request that gets no response
 *      at all is indistinguishable from one that was blocked.
 *   2. The process stays up, Mongoose buffers the query for 10 seconds, and the
 *      request eventually dies with a timeout that names no cause.
 *
 * A 503 that says which knob to turn beats both.
 */
function dbReady(req, res, next) {
  if (mongoose.connection.readyState === 1) return next();

  res.status(503).json({
    message:
      'Database not connected. Check MONGO_URI in server/.env and that MongoDB is running (see the API console).',
    db: dbState(),
  });
}

module.exports = { dbReady, dbState };
