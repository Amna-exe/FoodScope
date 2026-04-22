const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      type: 'NOT_FOUND_ERROR',
      message: 'Route not found.',
      details: null
    }
  });
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.payload) {
    return res.status(err.status || 500).json(err.payload);
  }

  return res.status(err.status || 500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      type: 'SERVER_ERROR',
      message: err.message || 'Something went wrong.',
      details: null
    }
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
