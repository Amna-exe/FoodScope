const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_UNAUTHORIZED',
        type: 'AUTH_ERROR',
        message: 'Unauthorized.',
        details: null
      }
    });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'AUTH_FORBIDDEN',
        type: 'AUTH_ERROR',
        message: 'Forbidden for this role.',
        details: null
      }
    });
  }

  return next();
};

module.exports = {
  requireRole
};
