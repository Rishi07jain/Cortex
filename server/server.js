require('dotenv').config();

const connectDB = require('./src/config/db');
const app = require('./src/app');

// 5001, not 5000: macOS's AirPlay Receiver (AirTunes) owns port 5000 and answers
// before Express ever sees the request, which shows up as a CORS/403 mystery.
// Number(): a PORT read from .env is a string, and the hint below compares it.
const PORT = Number(process.env.PORT) || 5001;

// Fail loudly at boot instead of throwing an opaque 500 on the first sign-in.
if (!process.env.JWT_SECRET) {
  console.error('[api] JWT_SECRET is not set. Copy server/.env.example to server/.env');
  console.error('[api] Generate one: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  process.exit(1);
}

// Open the port FIRST, then connect to Mongo.
//
// The other order is tempting but has a nasty failure mode: if the database is
// unreachable the process dies before anything listens, and the browser has no
// way to distinguish "nothing answered" from "my origin was blocked" - so a
// Mongo problem shows up in devtools as "CORS Failed". Listening first means
// the preflight always succeeds and the real error reaches the UI as a 503.
const server = app.listen(PORT, () => {
  console.log(`[api] Cortex API listening on http://localhost:${PORT}`);
});

// If the port is already taken, say why instead of a silent EADDRINUSE crash.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[api] Port ${PORT} is already in use.`);
    console.error(`[api] Find the process: lsof -nP -iTCP:${PORT} -sTCP:LISTEN`);
    if (PORT === 5000) {
      console.error('[api] On macOS, port 5000 belongs to AirPlay Receiver (AirTunes) -');
      console.error('[api] set PORT=5001 in server/.env (and update NEXT_PUBLIC_API_URL to match).');
    }
    process.exit(1);
  }
  throw err;
});

connectDB().catch((err) => {
  console.error('');
  console.error('  ─────────────────────────────────────────────────────────────');
  console.error(`  [db] MongoDB connection FAILED: ${err.message}`);
  console.error('  [db] The API is up, but every /api route will answer 503');
  console.error('  [db] until this is fixed. Check MONGO_URI in server/.env.');
  console.error('  [db] Atlas? Add your current IP under Network Access.');
  console.error('  [db] Local? Start it: brew services start mongodb-community');
  console.error('  ─────────────────────────────────────────────────────────────');
  console.error('');

  // In production a supervisor should restart us rather than serve 503s
  // forever. In development, staying up is what makes the error visible.
  if (process.env.NODE_ENV === 'production') process.exit(1);
});

// Don't die silently on an unhandled rejection.
process.on('unhandledRejection', (reason) => {
  console.error('[api] Unhandled rejection:', reason);
});
