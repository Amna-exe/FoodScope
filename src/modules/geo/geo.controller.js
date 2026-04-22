const { getNearbyRestaurants } = require('./geo.service');

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

const nearby = async (req, res) => {
  try {
    const result = await getNearbyRestaurants(req.query);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  nearby
};
