'use strict';

const { ZodError } = require('zod');

class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

/** Express error handler — must be registered last. */
function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return res.status(400).json({ error: 'Validation failed', details: issues });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ error: 'A record with this value already exists' });
  }
  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return res.status(409).json({ error: 'Operation violates a data relationship' });
  }
  console.error('[error]', err);
  const message = req.app.get('env') === 'production' ? 'Internal server error' : err.message;
  return res.status(500).json({ error: message });
}

function notFoundHandler(req, res) {
  return res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { AppError, errorHandler, notFoundHandler };
