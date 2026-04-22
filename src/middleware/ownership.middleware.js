const mongoose = require('mongoose');
const { createApiError } = require('../modules/auth/auth.service');

const sendError = (res, err) => res.status(err.status || 500).json(err.payload || {
  success: false,
  error: {
    code: 'INTERNAL_SERVER_ERROR',
    type: 'SERVER_ERROR',
    message: err.message || 'Something went wrong.',
    details: null
  }
});

const loadResource = ({
  model,
  paramId = 'id',
  attachAs = 'resource',
  notFoundCode = 'RESOURCE_NOT_FOUND',
  notFoundMessage = 'Resource not found.',
  additionalQuery = {}
}) => async (req, res, next) => {
  try {
    const id = req.params[paramId];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createApiError(404, notFoundCode, 'NOT_FOUND_ERROR', notFoundMessage);
    }

    const resource = await model.findOne({ _id: id, ...additionalQuery });
    if (!resource) {
      throw createApiError(404, notFoundCode, 'NOT_FOUND_ERROR', notFoundMessage);
    }

    req[attachAs] = resource;
    return next();
  } catch (err) {
    return sendError(res, err);
  }
};

const requireOwnership = ({
  ownerField = 'user_id',
  resourceKey = 'resource',
  allowAdmin = true,
  forbiddenCode = 'AUTH_FORBIDDEN',
  forbiddenMessage = 'Forbidden.'
} = {}) => (req, res, next) => {
  const user = req.user;
  const resource = req[resourceKey];

  if (!user || !resource) {
    return sendError(res, createApiError(401, 'AUTH_UNAUTHORIZED', 'AUTH_ERROR', 'Unauthorized.'));
  }

  const isAdmin = allowAdmin && user.role === 'admin';
  const isOwner = String(resource[ownerField]) === String(user.id);

  if (!isOwner && !isAdmin) {
    return sendError(res, createApiError(403, forbiddenCode, 'AUTH_ERROR', forbiddenMessage));
  }

  req.ownership = { isOwner, isAdmin };
  return next();
};

module.exports = {
  loadResource,
  requireOwnership
};
