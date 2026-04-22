const express = require('express');
const router = express.Router();
const { createApiError } = require('../auth/auth.service');
const { validate } = require('../../middleware/validate.middleware');
const { nearby } = require('./geo.controller');

const validateNearbyQuery = (req) => {
  const { lat, lng, radius } = req.query;

  if (lat === undefined || lng === undefined) {
    throw createApiError(400, 'GEO_MISSING_PARAMS', 'VALIDATION_ERROR', 'lat and lng are required.');
  }

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  const parsedRadius = radius === undefined ? 5 : Number(radius);

  if (
    Number.isNaN(parsedLat) ||
    Number.isNaN(parsedLng) ||
    parsedLat < -90 ||
    parsedLat > 90 ||
    parsedLng < -180 ||
    parsedLng > 180
  ) {
    throw createApiError(422, 'GEO_INVALID_COORDINATES', 'VALIDATION_ERROR', 'Invalid coordinates.');
  }

  if (Number.isNaN(parsedRadius) || parsedRadius <= 0) {
    throw createApiError(400, 'GEO_INVALID_RADIUS', 'VALIDATION_ERROR', 'radius must be a positive number.');
  }

  if (parsedRadius > 50) {
    throw createApiError(422, 'GEO_RADIUS_EXCEEDED', 'VALIDATION_ERROR', 'Maximum radius is 50km.');
  }
};

router.get('/nearby', validate(validateNearbyQuery), nearby);

module.exports = router;
