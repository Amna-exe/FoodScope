const {
  addComment,
  getCommentsByReview,
  deleteComment
} = require('./comments.service');

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

const createComment = async (req, res) => {
  try {
    const result = await addComment(req.review._id, req.user.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const listComments = async (req, res) => {
  try {
    const result = await getCommentsByReview(req.review._id);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

const removeComment = async (req, res) => {
  try {
    const result = await deleteComment(req.comment);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  createComment,
  listComments,
  removeComment
};
