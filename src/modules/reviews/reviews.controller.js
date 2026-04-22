const {
  createReview,
  getReviewsByRestaurant,
  updateReview,
  deleteReview,
  voteReview
} = require('./reviews.service');

const handleError = (res, err) => {
  if (err.payload) {
    return res.status(err.status || 500).json(err.payload);
  }

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      type: 'SERVER_ERROR',
      message: err.message || 'Something went wrong.',
      details: null
    }
  });
};

const createNewReview = async (req, res) => {
  try {
    const result = await createReview(req.user.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const listReviews = async (req, res) => {
  try {
    const result = await getReviewsByRestaurant(req.query);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const updateExistingReview = async (req, res) => {
  try {
    const result = await updateReview(req.review, req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const removeReview = async (req, res) => {
  try {
    const result = await deleteReview(req.review);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const voteOnReview = async (req, res) => {
  try {
    const result = await voteReview(req.review, req.user.id, req.body.vote_type);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  createNewReview,
  listReviews,
  updateExistingReview,
  removeReview,
  voteOnReview
};
