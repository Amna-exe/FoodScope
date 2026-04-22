const { createApiError } = require('../auth/auth.service');

const normalizePage = (page) => {
  const parsed = Number(page);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const normalizeLimit = (limit) => {
  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed <= 0) return 10;
  return Math.min(parsed, 50);
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const priceRangeToValue = (priceRange) => {
  if (typeof priceRange !== 'string') return null;
  if (!['$', '$$', '$$$'].includes(priceRange)) return null;
  return priceRange.length;
};

const buildSearchQuery = (query) => {
  const {
    q,
    type = 'all',
    cuisine,
    min_rating,
    max_price,
    dietary_tags,
    lat,
    lng,
    radius
  } = query;

  if (!q || String(q).trim().length < 2) {
    throw createApiError(400, 'SEARCH_QUERY_INVALID', 'VALIDATION_ERROR', 'q is required and must be at least 2 characters.');
  }

  if (!['restaurant', 'dish', 'all'].includes(type)) {
    throw createApiError(400, 'SEARCH_TYPE_INVALID', 'VALIDATION_ERROR', 'type must be restaurant, dish, or all.');
  }

  const page = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);
  const text = String(q).trim();

  const restaurantQuery = {
    status: 'approved'
  };

  const dishQuery = {};

  if (cuisine) {
    restaurantQuery.cuisine_type = cuisine;
  }

  if (min_rating !== undefined) {
    const rating = Number(min_rating);
    if (Number.isNaN(rating) || rating < 0 || rating > 5) {
      throw createApiError(400, 'SEARCH_MIN_RATING_INVALID', 'VALIDATION_ERROR', 'min_rating must be between 0 and 5.');
    }
    restaurantQuery.avg_rating = { $gte: rating };
  }

  if (max_price !== undefined) {
    const numericMaxPrice = Number(max_price);
    const dollarMaxPrice = priceRangeToValue(max_price);

    if (!Number.isNaN(numericMaxPrice)) {
      dishQuery.price = { $lte: numericMaxPrice };
    } else if (dollarMaxPrice) {
      restaurantQuery.price_range = { $in: ['$', '$$', '$$$'].filter((item) => item.length <= dollarMaxPrice) };
    } else {
      throw createApiError(400, 'SEARCH_MAX_PRICE_INVALID', 'VALIDATION_ERROR', 'max_price is invalid.');
    }
  }

  if (dietary_tags) {
    const tags = String(dietary_tags)
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);
    if (tags.length > 0) {
      dishQuery.dietary_tags = { $in: tags };
    }
  }

  if (lat !== undefined || lng !== undefined || radius !== undefined) {
    if (lat === undefined || lng === undefined || radius === undefined) {
      throw createApiError(400, 'SEARCH_GEO_FILTER_INVALID', 'VALIDATION_ERROR', 'lat, lng and radius are required together.');
    }

    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    const parsedRadius = Number(radius);

    if (
      Number.isNaN(parsedLat) ||
      Number.isNaN(parsedLng) ||
      Number.isNaN(parsedRadius) ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLng < -180 ||
      parsedLng > 180 ||
      parsedRadius <= 0
    ) {
      throw createApiError(400, 'SEARCH_GEO_FILTER_INVALID', 'VALIDATION_ERROR', 'Invalid geo filter parameters.');
    }

    restaurantQuery.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parsedLng, parsedLat]
        },
        $maxDistance: parsedRadius
      }
    };
  }

  return {
    type,
    page,
    limit,
    text,
    regex: new RegExp(escapeRegex(text), 'i'),
    restaurantQuery,
    dishQuery
  };
};

module.exports = {
  buildSearchQuery
};
