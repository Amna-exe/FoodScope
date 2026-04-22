const mongoose = require('mongoose');
const Restaurant = require('./restaurant.model');
const User = require('../auth/auth.model');
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

const validateCoordinates = (lat, lng) => {
  if (lat === undefined || lng === undefined) return;
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (
    Number.isNaN(parsedLat) ||
    Number.isNaN(parsedLng) ||
    parsedLat < -90 ||
    parsedLat > 90 ||
    parsedLng < -180 ||
    parsedLng > 180
  ) {
    throw createApiError(422, 'RESTAURANTS_INVALID_COORDINATES', 'VALIDATION_ERROR', 'Invalid latitude/longitude values.');
  }
};

const listRestaurants = async (query) => {
  const {
    cuisine,
    min_rating,
    price_range,
    tag,
    lat,
    lng,
    radius,
    page,
    limit
  } = query;

  const currentPage = normalizePage(page);
  const currentLimit = normalizeLimit(limit);
  const filters = { status: 'approved' };

  if (cuisine) filters.cuisine_type = cuisine;
  if (price_range) {
    if (!['$', '$$', '$$$'].includes(price_range)) {
      throw createApiError(400, 'RESTAURANTS_INVALID_PRICE_RANGE', 'VALIDATION_ERROR', 'Invalid price_range filter.');
    }
    filters.price_range = price_range;
  }

  if (min_rating !== undefined) {
    const parsedMinRating = Number(min_rating);
    if (Number.isNaN(parsedMinRating) || parsedMinRating < 0 || parsedMinRating > 5) {
      throw createApiError(400, 'RESTAURANTS_INVALID_MIN_RATING', 'VALIDATION_ERROR', 'Invalid min_rating filter.');
    }
    filters.avg_rating = { $gte: parsedMinRating };
  }

  if (tag) filters.tags = String(tag).toLowerCase();

  if (lat !== undefined || lng !== undefined || radius !== undefined) {
    if (lat === undefined || lng === undefined || radius === undefined) {
      throw createApiError(400, 'RESTAURANTS_INVALID_GEO_FILTERS', 'VALIDATION_ERROR', 'lat, lng and radius are required for geolocation filter.');
    }

    validateCoordinates(lat, lng);
    const parsedRadius = Number(radius);
    if (Number.isNaN(parsedRadius) || parsedRadius <= 0) {
      throw createApiError(400, 'RESTAURANTS_INVALID_RADIUS', 'VALIDATION_ERROR', 'Invalid radius filter.');
    }

    filters.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [Number(lng), Number(lat)]
        },
        $maxDistance: parsedRadius
      }
    };
  }

  const hasCustomFilters = Object.keys(filters).some((key) => key !== 'status');
  const sort = hasCustomFilters ? { createdAt: -1 } : { avg_rating: -1 };
  const skip = (currentPage - 1) * currentLimit;

  const [restaurants, total] = await Promise.all([
    Restaurant.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(currentLimit)
      .select('name cuisine_type price_range avg_rating address thumbnail'),
    Restaurant.countDocuments(filters)
  ]);

  return {
    restaurants: restaurants.map((restaurant) => ({
      id: restaurant._id,
      name: restaurant.name,
      cuisine_type: restaurant.cuisine_type,
      price_range: restaurant.price_range,
      avg_rating: restaurant.avg_rating,
      address: restaurant.address,
      thumbnail: restaurant.thumbnail
    })),
    total,
    page: currentPage
  };
};

const getRestaurantById = async (id, requesterRole) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createApiError(404, 'RESTAURANTS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Restaurant not found.');
  }

  const restaurant = await Restaurant.findById(id);
  if (!restaurant || restaurant.status === 'deleted') {
    throw createApiError(404, 'RESTAURANTS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Restaurant not found.');
  }

  if (restaurant.status === 'pending' && requesterRole !== 'admin') {
    throw createApiError(404, 'RESTAURANTS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Restaurant not found.');
  }

  return {
    id: restaurant._id,
    name: restaurant.name,
    description: restaurant.description,
    cuisine_type: restaurant.cuisine_type,
    price_range: restaurant.price_range,
    address: restaurant.address,
    lat: restaurant.lat,
    lng: restaurant.lng,
    avg_rating: restaurant.avg_rating,
    tags: restaurant.tags || [],
    dishes: [],
    recent_reviews: []
  };
};

const createRestaurant = async (user, payload) => {
  if (!user || !user.id) {
    throw createApiError(401, 'AUTH_UNAUTHORIZED', 'AUTH_ERROR', 'Unauthorized.');
  }

  if (!['reviewer', 'admin'].includes(user.role)) {
    throw createApiError(403, 'RESTAURANTS_FORBIDDEN_ROLE', 'AUTH_ERROR', 'Role is regular user.');
  }

  const {
    name,
    description,
    cuisine_type,
    price_range,
    address,
    lat,
    lng,
    tags
  } = payload;

  if (!name || !description || !cuisine_type || !price_range || !address || lat === undefined || lng === undefined) {
    throw createApiError(400, 'RESTAURANTS_MISSING_FIELDS', 'VALIDATION_ERROR', 'Missing required fields.');
  }

  if (!['$', '$$', '$$$'].includes(price_range)) {
    throw createApiError(400, 'RESTAURANTS_INVALID_PRICE_RANGE', 'VALIDATION_ERROR', 'Invalid price_range value.');
  }

  validateCoordinates(lat, lng);

  const duplicate = await Restaurant.findOne({ name: name.trim(), address: address.trim(), status: { $ne: 'deleted' } });
  if (duplicate) {
    throw createApiError(409, 'RESTAURANTS_DUPLICATE', 'CONFLICT_ERROR', 'Duplicate restaurant name at same address.');
  }

  const restaurant = await Restaurant.create({
    name,
    description,
    cuisine_type,
    price_range,
    address,
    lat: Number(lat),
    lng: Number(lng),
    tags: Array.isArray(tags) ? tags : [],
    owner_id: user.id,
    status: user.role === 'admin' ? 'approved' : 'pending'
  });

  return {
    id: restaurant._id,
    name: restaurant.name,
    status: restaurant.status,
    created_at: restaurant.createdAt
  };
};

const updateRestaurant = async (id, user, payload) => {
  if (!user || !user.id) {
    throw createApiError(401, 'AUTH_UNAUTHORIZED', 'AUTH_ERROR', 'Unauthorized.');
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createApiError(404, 'RESTAURANTS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Restaurant not found.');
  }

  const restaurant = await Restaurant.findById(id);
  if (!restaurant || restaurant.status === 'deleted') {
    throw createApiError(404, 'RESTAURANTS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Restaurant not found.');
  }

  const isAdmin = user.role === 'admin';
  const isOwner = String(restaurant.owner_id) === String(user.id);

  if (!isAdmin && !isOwner) {
    throw createApiError(403, 'RESTAURANTS_FORBIDDEN', 'AUTH_ERROR', 'Not the owner or admin.');
  }

  if (restaurant.status === 'suspended' && !isAdmin) {
    throw createApiError(403, 'RESTAURANTS_SUSPENDED', 'AUTH_ERROR', 'Only admin can update a suspended restaurant.');
  }

  const allowedFields = ['name', 'description', 'price_range', 'tags'];
  const providedFields = Object.keys(payload);
  const invalidFields = providedFields.filter((field) => !allowedFields.includes(field));

  if (providedFields.length === 0 || invalidFields.length > 0) {
    throw createApiError(400, 'RESTAURANTS_INVALID_FIELDS', 'VALIDATION_ERROR', 'Invalid update fields.');
  }

  if (payload.price_range !== undefined && !['$', '$$', '$$$'].includes(payload.price_range)) {
    throw createApiError(400, 'RESTAURANTS_INVALID_PRICE_RANGE', 'VALIDATION_ERROR', 'Invalid price_range value.');
  }

  if (payload.tags !== undefined && !Array.isArray(payload.tags)) {
    throw createApiError(400, 'RESTAURANTS_INVALID_TAGS', 'VALIDATION_ERROR', 'tags must be an array.');
  }

  if (payload.name !== undefined) restaurant.name = payload.name;
  if (payload.description !== undefined) restaurant.description = payload.description;
  if (payload.price_range !== undefined) restaurant.price_range = payload.price_range;
  if (payload.tags !== undefined) restaurant.tags = payload.tags;

  await restaurant.save();

  return {
    id: restaurant._id,
    name: restaurant.name,
    updated_at: restaurant.updatedAt
  };
};

const deleteRestaurant = async (id, user) => {
  if (!user || !user.id) {
    throw createApiError(401, 'AUTH_UNAUTHORIZED', 'AUTH_ERROR', 'Unauthorized.');
  }

  if (user.role !== 'admin') {
    throw createApiError(403, 'RESTAURANTS_ADMIN_ONLY', 'AUTH_ERROR', 'Not an admin.');
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createApiError(404, 'RESTAURANTS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Restaurant not found.');
  }

  const restaurant = await Restaurant.findById(id);
  if (!restaurant || restaurant.status === 'deleted') {
    throw createApiError(404, 'RESTAURANTS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Restaurant not found.');
  }

  restaurant.status = 'deleted';
  restaurant.deleted_at = new Date();
  await restaurant.save();

  try {
    const Review = mongoose.model('Review');
    await Review.updateMany(
      { restaurant_id: restaurant._id },
      { $set: { is_archived: true } }
    );
  } catch (error) {
    // Review model is optional in this codebase.
  }

  return { message: 'Restaurant deleted successfully.' };
};

const bookmarkRestaurant = async (restaurantId, user) => {
  if (!user || !user.id) {
    throw createApiError(401, 'AUTH_UNAUTHORIZED', 'AUTH_ERROR', 'Unauthorized.');
  }

  if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
    throw createApiError(404, 'RESTAURANTS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Restaurant not found.');
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant || restaurant.status !== 'approved') {
    throw createApiError(404, 'RESTAURANTS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Restaurant not found.');
  }

  const existingUser = await User.findById(user.id);
  if (!existingUser) {
    throw createApiError(401, 'AUTH_UNAUTHORIZED', 'AUTH_ERROR', 'Unauthorized.');
  }

  const alreadyBookmarked = (existingUser.bookmarks || []).some(
    (bookmark) => String(bookmark.restaurant_id) === String(restaurant._id)
  );

  if (alreadyBookmarked) {
    throw createApiError(409, 'RESTAURANTS_ALREADY_BOOKMARKED', 'CONFLICT_ERROR', 'Already bookmarked.');
  }

  existingUser.bookmarks.push({
    restaurant_id: String(restaurant._id),
    name: restaurant.name,
    avg_rating: restaurant.avg_rating,
    saved_at: new Date()
  });

  await existingUser.save();
  const bookmark = existingUser.bookmarks[existingUser.bookmarks.length - 1];

  return {
    message: 'Bookmarked successfully.',
    bookmark_id: bookmark._id
  };
};

module.exports = {
  listRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  bookmarkRestaurant
};
