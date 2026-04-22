const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_UNAUTHORIZED',
          type: 'AUTH_ERROR',
          message: 'Not authorized, token failed',
          details: null
        }
      });
    }
  }

  return res.status(401).json({
    success: false,
    error: {
      code: 'AUTH_UNAUTHORIZED',
      type: 'AUTH_ERROR',
      message: 'No token, not authorized',
      details: null
    }
  });
};

module.exports = {
  authenticate
};
