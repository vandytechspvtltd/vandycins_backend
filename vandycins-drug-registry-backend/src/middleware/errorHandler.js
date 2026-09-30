function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const message = error.publicMessage || (statusCode >= 500
    ? 'An internal server error occurred.'
    : error.message || 'Request failed.');

  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}] ${error.message}`);
  }

  return res.status(statusCode).json({
    success: false,
    message
  });
}

module.exports = errorHandler;
