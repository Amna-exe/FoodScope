const mongoose = require('mongoose');
const Review = require('./review.model');
const Restaurant = require('../restaurants/restaurant.model');
const Dish = require('../dishes/dish.model');
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

const recalculateRestaurantRating = async (restaurantId) => {
  const aggregate = await Review.aggregate([
    { $match: { restaurant_id: new mongoose.Types.ObjectId(restaurantId), status: 'active' } },
    {
      $group: {
        _id: '$restaurant_id',
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  const avgRating = aggregate.length ? Number(aggregate[0].avgRating.toFixed(2)) : 0;
  await Restaurant.findByIdAndUpdate(restaurantId, { avg_rating: avgRating });
};

const processPhotos = async (photos) => {
  if (!photos) return [];
  if (!Array.isArray(photos)) {
    throw createApiError(400, 'REVIEWS_INVALID_PHOTOS', 'VALIDATION_ERROR', 'photos must be an array.');
  }
  if (photos.length > 5) {
    throw createApiError(400, 'REVIEWS_TOO_MANY_PHOTOS', 'VALIDATION_ERROR', 'Maximum 5 photos allowed.');
  }

  const accepted = [];
  for (const photo of photos) {
    try {
      if (typeof photo !== 'string' || photo.trim() === '') {
        throw new Error('Invalid base64 photo.');
      }
      accepted.push(photo);
    } catch (error) {
      console.warn(`Review photo processing failed: ${error.message}`);
    }
  }
  return accepted;
};

const createReview = async (userId, payload) => {
  const { restaurant_id, dish_id, rating, body, photos } = payload;

  if (!restaurant_id) {
    throw createApiError(400, 'REVIEWS_RESTAURANT_REQUIRED', 'VALIDATION_ERROR', 'restaurant_id is required.');
  }

  if (!mongoose.Types.ObjectId.isValid(restaurant_id)) {
    throw createApiError(404, 'RESTAURANTS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Restaurant not found.');
  }

  const restaurant = await Restaurant.findById(restaurant_id);
  if (!restaurant || restaurant.status === 'deleted') {
    throw createApiError(404, 'RESTAURANTS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Restaurant not found.');
  }

  const numericRating = Number(rating);
  if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    throw createApiError(422, 'REVIEWS_INVALID_RATING', 'VALIDATION_ERROR', 'Rating must be between 1 and 5.');
  }

  if (dish_id !== undefined && dish_id !== null) {
    if (!mongoose.Types.ObjectId.isValid(dish_id)) {
      throw createApiError(404, 'DISHES_NOT_FOUND', 'NOT_FOUND_ERROR', 'Dish not found.');
    }
    const dish = await Dish.findOne({ _id: dish_id, restaurant_id });
    if (!dish) {
      throw createApiError(404, 'DISHES_NOT_FOUND', 'NOT_FOUND_ERROR', 'Dish not found.');
    }
  }

  const photoList = await processPhotos(photos);

  try {
    const review = await Review.create({
      user_id: userId,
      restaurant_id,
      dish_id: dish_id || null,
      rating: numericRating,
      body: body || '',
      photos: photoList
    });

    await recalculateRestaurantRating(restaurant_id);

    return {
      id: review._id,
      user_id: review.user_id,
      restaurant_id: review.restaurant_id,
      rating: review.rating,
      body: review.body,
      photos: review.photos,
      created_at: review.createdAt
    };
  } catch (error) {
    if (error && error.code === 11000) {
      throw createApiError(409, 'REVIEWS_DUPLICATE', 'CONFLICT_ERROR', 'One review per user per restaurant is allowed.');
    }
    throw error;
  }
};

const getReviewsByRestaurant = async (query) => {
  const { restaurant_id, page, limit, sort } = query;

  if (!restaurant_id) {
    throw createApiError(400, 'REVIEWS_RESTAURANT_REQUIRED', 'VALIDATION_ERROR', 'restaurant_id query parameter is required.');
  }

  if (!mongoose.Types.ObjectId.isValid(restaurant_id)) {
    throw createApiError(404, 'RESTAURANTS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Restaurant not found.');
  }

  const restaurant = await Restaurant.findById(restaurant_id);
  if (!restaurant || restaurant.status === 'deleted') {
    throw createApiError(404, 'RESTAURANTS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Restaurant not found.');
  }

  const currentPage = normalizePage(page);
  const currentLimit = normalizeLimit(limit);
  const skip = (currentPage - 1) * currentLimit;

  let sortQuery = { helpful_count: -1, createdAt: -1 };
  if (sort === 'newest') sortQuery = { createdAt: -1 };
  if (sort === 'highest_rated') sortQuery = { rating: -1, createdAt: -1 };
  if (sort === 'most_helpful' || !sort) sortQuery = { helpful_count: -1, createdAt: -1 };

  const [reviews, total, ratingAgg] = await Promise.all([
    Review.find({ restaurant_id, status: 'active' })
      .sort(sortQuery)
      .skip(skip)
      .limit(currentLimit)
      .populate('user_id', 'name avatar_url'),
    Review.countDocuments({ restaurant_id, status: 'active' }),
    Review.aggregate([
      { $match: { restaurant_id: new mongoose.Types.ObjectId(restaurant_id), status: 'active' } },
      {
        $group: {
          _id: '$restaurant_id',
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ])
  ]);

  const summary = ratingAgg[0] || { avgRating: 0, totalReviews: 0 };

  return {
    reviews: reviews.map((review) => ({
      id: review._id,
      rating: review.rating,
      body: review.body,
      photos: review.photos,
      helpful_count: review.helpful_count,
      not_helpful_count: review.not_helpful_count,
      created_at: review.createdAt,
      user: {
        id: review.user_id?._id || null,
        name: review.user_id?.name || '',
        avatar_url: review.user_id?.avatar_url || ''
      }
    })),
    avg_rating: Number((summary.avgRating || 0).toFixed(2)),
    total_reviews: summary.totalReviews || 0,
    total,
    page: currentPage
  };
};

const triggerModerationHook = async (reviewId) => {
  console.warn(`Moderation hook triggered for review ${reviewId}`);
};

const updateReview = async (review, payload) => {
  const providedFields = Object.keys(payload);
  const allowedFields = ['rating', 'body'];
  const invalidFields = providedFields.filter((field) => !allowedFields.includes(field));

  if (providedFields.length === 0 || invalidFields.length > 0) {
    throw createApiError(400, 'REVIEWS_INVALID_FIELDS', 'VALIDATION_ERROR', 'Invalid fields.');
  }

  const bodyChanged = payload.body !== undefined && payload.body !== review.body;

  if (payload.rating !== undefined) {
    const numericRating = Number(payload.rating);
    if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      throw createApiError(422, 'REVIEWS_INVALID_RATING', 'VALIDATION_ERROR', 'Rating must be between 1 and 5.');
    }
    review.rating = numericRating;
  }

  if (payload.body !== undefined) {
    review.body = payload.body;
  }

  await review.save();
  await recalculateRestaurantRating(review.restaurant_id);

  if (bodyChanged) {
    await triggerModerationHook(review._id);
  }

  return {
    id: review._id,
    rating: review.rating,
    body: review.body,
    updated_at: review.updatedAt
  };
};

const deleteReview = async (review) => {
  review.status = 'archived';
  review.archived_at = new Date();
  await review.save();

  await recalculateRestaurantRating(review.restaurant_id);

  return { message: 'Review deleted.' };
};

const voteReview = async (review, userId, voteType) => {
  if (!['helpful', 'not_helpful'].includes(voteType)) {
    throw createApiError(400, 'REVIEWS_INVALID_VOTE', 'VALIDATION_ERROR', 'vote_type must be helpful or not_helpful.');
  }

  const voteIndex = review.votes.findIndex((vote) => String(vote.user_id) === String(userId));

  if (voteIndex !== -1) {
    const existing = review.votes[voteIndex];
    if (existing.vote_type === voteType) {
      throw createApiError(409, 'REVIEWS_DUPLICATE_VOTE', 'CONFLICT_ERROR', 'Duplicate vote not allowed.');
    }

    // Toggle vote by removing previous vote first.
    review.votes.splice(voteIndex, 1);
    if (existing.vote_type === 'helpful') review.helpful_count = Math.max(0, review.helpful_count - 1);
    if (existing.vote_type === 'not_helpful') review.not_helpful_count = Math.max(0, review.not_helpful_count - 1);
  }

  review.votes.push({ user_id: userId, vote_type: voteType });
  if (voteType === 'helpful') review.helpful_count += 1;
  if (voteType === 'not_helpful') review.not_helpful_count += 1;

  await review.save();

  return {
    message: 'Vote recorded.',
    helpful_count: review.helpful_count,
    not_helpful_count: review.not_helpful_count
  };
};

module.exports = {
  createReview,
  getReviewsByRestaurant,
  updateReview,
  deleteReview,
  voteReview
};
