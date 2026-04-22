const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  review_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
    required: true,
    index: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  parent_comment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true
  },
  depth: {
    type: Number,
    default: 0,
    min: 0,
    max: 2
  },
  body: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['active', 'deleted'],
    default: 'active'
  },
  deleted_at: {
    type: Date,
    default: null
  }
}, { timestamps: true });

commentSchema.index({ review_id: 1, parent_comment_id: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
