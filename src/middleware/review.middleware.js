const Review = require('../modules/reviews/review.model');
const { createApiError } = require('../modules/auth/auth.service');
const { loadResource } = require('./ownership.middleware');

const loadReview = loadResource({
  model: Review,
  paramId: 'id',
  attachAs: 'review',
  notFoundCode: 'REVIEWS_NOT_FOUND',
  notFoundMessage: 'Review not found.',
  additionalQuery: { status: 'active' }
});

const preventSelfVote = (req, res, next) => {
  if (!req.user || !req.review) {
    const err = createApiError(401, 'AUTH_UNAUTHORIZED', 'AUTH_ERROR', 'Unauthorized.');
    return res.status(err.status).json(err.payload);
  }

  if (String(req.user.id) === String(req.review.user_id)) {
    const err = createApiError(403, 'REVIEWS_SELF_VOTE_BLOCKED', 'AUTH_ERROR', 'Users cannot vote on their own review.');
    return res.status(err.status).json(err.payload);
  }

  return next();
};

module.exports = {
  loadReview,
  preventSelfVote
};
