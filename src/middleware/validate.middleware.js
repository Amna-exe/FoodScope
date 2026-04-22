const { createApiError } = require('../modules/auth/auth.service');

const validate = (validatorFn) => (req, res, next) => {
  try {
    validatorFn(req);
    return next();
  } catch (err) {
    if (err.payload) {
      return res.status(err.status || 500).json(err.payload);
    }

    const fallback = createApiError(400, 'VALIDATION_ERROR', 'VALIDATION_ERROR', err.message || 'Invalid request.');
    return res.status(fallback.status).json(fallback.payload);
  }
};

module.exports = {
  validate
};
