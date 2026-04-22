const mongoose = require('mongoose');
const User = require('../auth/auth.model');
const Restaurant = require('../restaurants/restaurant.model');
const Review = require('../reviews/review.model');
const { addNotification } = require('../users/users.service');
const { createApiError } = require('../auth/auth.service');

const normalizePage = (page) => {
  const parsed = Number(page);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const normalizeLimit = (limit) => {
  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed <= 0) return 10;
  return Math.min(parsed, 100);
};

const listUsers = async (query) => {
  const { role, status } = query;
  const page = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);
  const skip = (page - 1) * limit;

  const filter = {};
  if (role) filter.role = role;
  if (status) {
    if (!['active', 'suspended'].includes(status)) {
      throw createApiError(400, 'ADMIN_INVALID_STATUS_FILTER', 'VALIDATION_ERROR', 'status must be active or suspended.');
    }
    filter.isSuspended = status === 'suspended';
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('name email role isSuspended review_count'),
    User.countDocuments(filter)
  ]);

  return {
    users: users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.isSuspended ? 'suspended' : 'active',
      review_count: user.review_count || 0
    })),
    total
  };
};

const updateRestaurantStatus = async (restaurantId, payload) => {
  const { status, reason } = payload;

  if (!status) {
    throw createApiError(400, 'ADMIN_STATUS_REQUIRED', 'VALIDATION_ERROR', 'status is required.');
  }

  const allowed = ['approved', 'rejected', 'suspended'];
  if (!allowed.includes(status)) {
    throw createApiError(400, 'ADMIN_INVALID_RESTAURANT_STATUS', 'VALIDATION_ERROR', 'Invalid restaurant status.');
  }

  if (['rejected', 'suspended'].includes(status)) {
    if (!reason || String(reason).trim() === '') {
      throw createApiError(400, 'ADMIN_REASON_REQUIRED', 'VALIDATION_ERROR', 'reason is required for this status.');
    }
  }

  if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
    throw createApiError(404, 'RESTAURANTS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Restaurant not found.');
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || restaurant.status === 'deleted') {
    throw createApiError(404, 'RESTAURANTS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Restaurant not found.');
  }

  restaurant.status = status;
  await restaurant.save();

  try {
    const message = ['rejected', 'suspended'].includes(status)
      ? `Your restaurant "${restaurant.name}" has been ${status}. Reason: ${String(reason).trim()}`
      : `Your restaurant "${restaurant.name}" has been approved.`;
    await addNotification(restaurant.owner_id, { type: 'restaurant_status', message });
  } catch (err) {
    console.warn(`Failed to notify restaurant owner ${restaurant.owner_id}: ${err.message}`);
  }

  return {
    id: restaurant._id,
    status: restaurant.status,
    updated_at: restaurant.updatedAt
  };
};

const moderateReview = async (reviewId, payload) => {
  const { action, reason } = payload;

  if (!action) {
    throw createApiError(400, 'ADMIN_ACTION_REQUIRED', 'VALIDATION_ERROR', 'action is required.');
  }

  if (!['hide', 'restore'].includes(action)) {
    throw createApiError(400, 'ADMIN_INVALID_ACTION', 'VALIDATION_ERROR', 'action must be hide or restore.');
  }

  if (action === 'hide' && (!reason || String(reason).trim() === '')) {
    throw createApiError(400, 'ADMIN_REASON_REQUIRED', 'VALIDATION_ERROR', 'reason is required when hiding a review.');
  }

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    throw createApiError(404, 'REVIEWS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Review not found.');
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    throw createApiError(404, 'REVIEWS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Review not found.');
  }

  review.status = action === 'hide' ? 'hidden' : 'active';
  await review.save();

  return {
    id: review._id,
    status: review.status,
    updated_at: review.updatedAt
  };
};

const getAnalytics = async () => {
  const [
    totalUsers,
    totalRestaurants,
    totalReviews,
    pendingRestaurants,
    topRatedRestaurants,
    mostActiveReviewers
  ] = await Promise.all([
    User.countDocuments({}),
    Restaurant.countDocuments({ status: { $ne: 'deleted' } }),
    Review.countDocuments({ status: { $ne: 'archived' } }),
    Restaurant.countDocuments({ status: 'pending' }),
    Restaurant.find({ status: 'approved' })
      .sort({ avg_rating: -1 })
      .limit(5)
      .select('name avg_rating cuisine_type price_range'),
    User.find({ role: 'reviewer' })
      .sort({ review_count: -1 })
      .limit(10)
      .select('name email review_count role')
  ]);

  return {
    total_users: totalUsers,
    total_restaurants: totalRestaurants,
    total_reviews: totalReviews,
    pending_restaurants: pendingRestaurants,
    top_rated_restaurants: topRatedRestaurants.map((r) => ({
      id: r._id,
      name: r.name,
      avg_rating: r.avg_rating,
      cuisine_type: r.cuisine_type,
      price_range: r.price_range
    })),
    most_active_reviewers: mostActiveReviewers.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      review_count: u.review_count || 0
    }))
  };
};

module.exports = {
  listUsers,
  updateRestaurantStatus,
  moderateReview,
  getAnalytics
};
