const {
  getOwnProfile,
  updateOwnProfile,
  getOwnBookmarks,
  getOwnNotifications
} = require('./users.service');

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

const me = async (req, res) => {
  try {
    const result = await getOwnProfile(req.user.id);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const updateMe = async (req, res) => {
  try {
    const result = await updateOwnProfile(req.user.id, req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const meBookmarks = async (req, res) => {
  try {
    const result = await getOwnBookmarks(req.user.id, req.query);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const meNotifications = async (req, res) => {
  try {
    const result = await getOwnNotifications(req.user.id, req.query.unread_only);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  me,
  updateMe,
  meBookmarks,
  meNotifications
};
