const multer = require('multer');

function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // An explicit err.statusCode wins: services throw with one to say "this is a
  // 400, not a 500" without needing a handle on the response object.
  let statusCode =
    err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'Server error';

  // Mongoose: bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Mongoose: validation failed - surface every field message at once
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  // Mongo: duplicate key (e.g. email already registered)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || { field: '' })[0];
    message = `That ${field || 'value'} is already in use`;
  }

  // Multer: upload rejected. Its own messages ("File too large") are terse and
  // don't say what the limit is, which is the one thing the user needs to know.
  if (err instanceof multer.MulterError) {
    statusCode = 413;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'That file is larger than the 25 MB limit';
    else if (err.code === 'LIMIT_FILE_COUNT') message = 'Please upload one file at a time';
    else if (err.code === 'LIMIT_UNEXPECTED_FILE') message = 'Unexpected file field in the upload';
    else message = `Upload rejected: ${err.message}`;
  }

  res.status(statusCode).json({
    message,
    // Only leak internals when NODE_ENV is explicitly 'development'.
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

module.exports = { notFound, errorHandler };
