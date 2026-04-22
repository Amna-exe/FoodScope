const { searchData } = require('./search.service');

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

const search = async (req, res) => {
  try {
    const result = await searchData(req.query);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  search
};
