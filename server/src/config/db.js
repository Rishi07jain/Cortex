const mongoose = require('mongoose');

/**
 * Connects to MongoDB.
 *
 * Throws instead of calling process.exit() - server.js decides what to do. In
 * development we'd rather keep the port open and answer with a readable 503
 * than die, because a dead port makes the browser report a phantom CORS error.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not set. Copy server/.env.example to server/.env');
  }

  mongoose.set('strictQuery', true);

  const conn = await mongoose.connect(uri, {
    // Default is 30s, which feels like a hang. 8s makes a bad URI or a
    // missing Atlas IP allowlist entry obvious while you're still watching.
    serverSelectionTimeoutMS: 8000,
  });

  console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
}

module.exports = connectDB;
