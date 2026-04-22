const mongoose = require('mongoose');
const Comment = require('./comment.model');
const { createApiError } = require('../auth/auth.service');

const buildThreadedComments = (comments) => {
  const map = new Map();
  const roots = [];

  comments.forEach((comment) => {
    map.set(String(comment._id), {
      id: comment._id,
      review_id: comment.review_id,
      user: {
        id: comment.user_id?._id || null,
        name: comment.user_id?.name || '',
        avatar_url: comment.user_id?.avatar_url || ''
      },
      parent_comment_id: comment.parent_comment_id,
      body: comment.status === 'deleted' ? '[deleted]' : comment.body,
      depth: comment.depth,
      created_at: comment.createdAt,
      replies: []
    });
  });

  map.forEach((comment) => {
    if (comment.parent_comment_id) {
      const parent = map.get(String(comment.parent_comment_id));
      if (parent) {
        parent.replies.push(comment);
        return;
      }
    }
    roots.push(comment);
  });

  return roots;
};

const addComment = async (reviewId, userId, payload) => {
  const { body, parent_comment_id } = payload;

  if (!body || String(body).trim() === '') {
    throw createApiError(400, 'COMMENTS_BODY_REQUIRED', 'VALIDATION_ERROR', 'body is required.');
  }

  let depth = 0;
  let parentCommentId = null;

  if (parent_comment_id !== undefined && parent_comment_id !== null) {
    if (!mongoose.Types.ObjectId.isValid(parent_comment_id)) {
      throw createApiError(400, 'COMMENTS_PARENT_INVALID', 'VALIDATION_ERROR', 'Invalid parent_comment_id.');
    }

    const parent = await Comment.findOne({ _id: parent_comment_id, review_id: reviewId });
    if (!parent) {
      throw createApiError(404, 'COMMENTS_PARENT_NOT_FOUND', 'NOT_FOUND_ERROR', 'Parent comment not found.');
    }

    depth = parent.depth + 1;
    if (depth > 2) {
      throw createApiError(400, 'COMMENTS_MAX_DEPTH', 'VALIDATION_ERROR', 'Max nesting depth is 2.');
    }

    parentCommentId = parent._id;
  }

  const comment = await Comment.create({
    review_id: reviewId,
    user_id: userId,
    parent_comment_id: parentCommentId,
    depth,
    body: String(body).trim()
  });

  return {
    id: comment._id,
    review_id: comment.review_id,
    parent_comment_id: comment.parent_comment_id,
    body: comment.body,
    depth: comment.depth,
    created_at: comment.createdAt
  };
};

const getCommentsByReview = async (reviewId) => {
  const comments = await Comment.find({ review_id: reviewId })
    .sort({ createdAt: 1 })
    .populate('user_id', 'name avatar_url');

  return {
    comments: buildThreadedComments(comments)
  };
};

const deleteComment = async (comment) => {
  const hasChildren = await Comment.exists({
    parent_comment_id: comment._id,
    review_id: comment.review_id,
    status: 'active'
  });

  if (hasChildren) {
    comment.status = 'deleted';
    comment.body = '[deleted]';
    comment.deleted_at = new Date();
    await comment.save();
  } else {
    await Comment.deleteOne({ _id: comment._id });
  }

  return { message: 'Comment deleted.' };
};

module.exports = {
  addComment,
  getCommentsByReview,
  deleteComment
};
