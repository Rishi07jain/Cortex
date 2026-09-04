const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { notFound, errorHandler } = require('./middleware/error');
const { dbReady, dbState } = require('./middleware/dbReady');
const authRoutes = require('./routes/authRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const canvasRoutes = require('./routes/canvasRoutes');
const assetRoutes = require('./routes/assetRoutes');

const app = express();

// --- core middleware ---
app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (curl, Postman) send no Origin header - let them through.
      if (!origin) return callback(null, true);

      const allowed = (process.env.CLIENT_URL || 'http://localhost:3000')
        .split(',')
        .map((u) => u.trim().replace(/\/+$/, ''))
        .filter(Boolean);

      if (allowed.includes(origin)) return callback(null, true);

      // Dev convenience: any localhost port works, so 3001 / 127.0.0.1 / [::1]
      // can't break sign-up again. Strict in production.
      const isLocalDev =
        process.env.NODE_ENV !== 'production' &&
        /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);

      if (isLocalDev) return callback(null, true);

      // Log it: a rejected origin is otherwise invisible from the browser side,
      // which only ever says "CORS failed" without naming the reason.
      console.warn(`[cors] blocked origin: ${origin} (allowed: ${allowed.join(', ') || 'none'})`);
      return callback(new Error(`CORS: origin ${origin} is not allowed`));
    },
    credentials: true, // required for the httpOnly auth cookie
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// --- uploaded files ---
// Step 3 removed the public express.static('/uploads') mount that used to live
// here. Anyone who could guess a filename could read the file - and on this app
// the files are evidence. Uploads are now served by GET /api/assets/:id/raw,
// which requires a session and checks that the asset's workspace is yours.

// --- routes ---
// Health deliberately sits above the dbReady guard, so it still answers while
// Mongo is down - that's exactly when you need it to tell you so.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'cortex-api',
    db: dbState(),
    time: new Date().toISOString(),
  });
});

// Everything below needs the database.
app.use('/api/auth', dbReady, authRoutes);
app.use('/api/workspaces', dbReady, workspaceRoutes);
app.use('/api/canvases', dbReady, canvasRoutes);
app.use('/api/assets', dbReady, assetRoutes);

// --- error handling (must come last) ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;
