const {
  listUsers,
  updateRestaurantStatus,
  moderateReview,
  getAnalytics
} = require('./admin.service');

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

const getUsers = async (req, res) => {
  try {
    const result = await listUsers(req.query);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const patchRestaurantStatus = async (req, res) => {
  try {
    const result = await updateRestaurantStatus(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const patchReviewModeration = async (req, res) => {
  try {
    const result = await moderateReview(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const getPlatformAnalytics = async (req, res) => {
  try {
    const result = await getAnalytics();
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  getUsers,
  patchRestaurantStatus,
  patchReviewModeration,
  getPlatformAnalytics
};
