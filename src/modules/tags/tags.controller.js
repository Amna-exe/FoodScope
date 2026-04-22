const {
  getApprovedTags,
  createTag,
  assignTagToRestaurant
} = require('./tags.service');

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

const listTags = async (req, res) => {
  try {
    const result = await getApprovedTags(req.query.type);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const createNewTag = async (req, res) => {
  try {
    const result = await createTag(req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const addTagToRestaurant = async (req, res) => {
  try {
    const result = await assignTagToRestaurant(req.restaurant, req.body.tag_id);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  listTags,
  createNewTag,
  addTagToRestaurant
};
