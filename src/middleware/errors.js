function notFound(req, res) {
  return res.status(404).json({
    error: {
      code: 'not_found',
      message: 'Route not found.',
    },
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || error.statusCode || (error.code === '23505' ? 409 : 500);
  const code = error.code === '23505' ? 'duplicate_resource' : error.code || 'internal_error';
  const isServerError = status >= 500;
  const message = isServerError
    ? 'Internal server error.'
    : error.message || 'Request failed.';

  if (isServerError) {
    console.error('Unhandled request error', {
      error,
      method: req.method,
      path: req.originalUrl,
      requestId: req.id,
    });
  }

  return res.status(status).json({
    error: {
      code,
      message,
      requestId: req.id,
    },
  });
}

module.exports = {
  errorHandler,
  notFound,
};
