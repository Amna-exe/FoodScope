const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { requireOwnership } = require('../../middleware/ownership.middleware');
const { loadReview, preventSelfVote } = require('../../middleware/review.middleware');
const {
  createNewReview,
  listReviews,
  updateExistingReview,
  removeReview,
  voteOnReview
} = require('./reviews.controller');

router.post('/', authenticate, createNewReview);
router.get('/', listReviews);
router.put('/:id', authenticate, loadReview, requireOwnership({
  resourceKey: 'review',
  ownerField: 'user_id',
  forbiddenCode: 'REVIEWS_FORBIDDEN',
  forbiddenMessage: 'Not review owner or admin.'
}), updateExistingReview);
router.delete('/:id', authenticate, loadReview, requireOwnership({
  resourceKey: 'review',
  ownerField: 'user_id',
  forbiddenCode: 'REVIEWS_FORBIDDEN',
  forbiddenMessage: 'Not review owner or admin.'
}), removeReview);
router.post('/:id/vote', authenticate, loadReview, preventSelfVote, voteOnReview);

module.exports = router;
