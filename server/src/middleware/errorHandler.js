/**
 * Centralized Global Error Handler
 * Translates PostgreSQL engine codes, triggers, check violations,
 * and uncaught exceptions into clean, structured HTTP responses.
 */
function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message || err);

  // PostgreSQL Error Codes mapping
  // 23505: Unique violation (e.g., uq_incident_zone)
  if (err.code === '23505') {
    return res.status(409).json({
      status: 'error',
      code: 'UNIQUE_VIOLATION',
      message: 'A duplicate record already exists with the provided unique fields.',
      detail: err.detail || err.message
    });
  }

  // 23514: Check constraint violation
  if (err.code === '23514') {
    return res.status(400).json({
      status: 'error',
      code: 'CHECK_CONSTRAINT_VIOLATION',
      message: 'Data violates database integrity check constraints.',
      constraint: err.constraint,
      detail: err.detail || err.message
    });
  }

  // 23503: Foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      status: 'error',
      code: 'FOREIGN_KEY_VIOLATION',
      message: 'Referenced entity does not exist.',
      constraint: err.constraint,
      detail: err.detail || err.message
    });
  }

  // P0001: PL/pgSQL RAISE EXCEPTION (from trg_dispatch_status, etc.)
  if (err.code === 'P0001' || (err.message && err.message.includes('dispatch'))) {
    return res.status(400).json({
      status: 'error',
      code: 'DATABASE_TRIGGER_ABORT',
      message: err.message,
      detail: 'State transition rejected by database integrity trigger.'
    });
  }

  // Insufficient inventory business error
  if (err.message && err.message.includes('Insufficient inventory')) {
    return res.status(400).json({
      status: 'error',
      code: 'INSUFFICIENT_INVENTORY',
      message: err.message
    });
  }

  // Generic internal server error
  res.status(err.status || 500).json({
    status: 'error',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected error occurred processing the request.'
  });
}

module.exports = errorHandler;
