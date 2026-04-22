const mongoose = require('mongoose');

const reviewVoteSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vote_type: {
    type: String,
    enum: ['helpful', 'not_helpful'],
    required: true
  }
}, { _id: false });

const reviewSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  restaurant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  dish_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dish',
    default: null
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  body: {
    type: String,
    default: '',
    trim: true,
    maxlength: 3000
  },
  photos: {
    type: [String],
    default: []
  },
  helpful_count: {
    type: Number,
    default: 0,
    min: 0
  },
  not_helpful_count: {
    type: Number,
    default: 0,
    min: 0
  },
  votes: {
    type: [reviewVoteSchema],
    default: []
  },
  status: {
    type: String,
    enum: ['active', 'hidden', 'archived'],
    default: 'active',
    index: true
  },
  archived_at: {
    type: Date,
    default: null
  }
}, { timestamps: true });

reviewSchema.index({ user_id: 1, restaurant_id: 1 }, { unique: true });
reviewSchema.index({ restaurant_id: 1, status: 1, helpful_count: -1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
