const Restaurant = require('../restaurants/restaurant.model');

const getNearbyRestaurants = async ({ lat, lng, radius }) => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  const radiusKm = radius === undefined ? 5 : Number(radius);
  const radiusMeters = radiusKm * 1000;

  const results = await Restaurant.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [longitude, latitude] },
        distanceField: 'distance_meters',
        maxDistance: radiusMeters,
        spherical: true,
        query: { status: 'approved' }
      }
    },
    { $sort: { distance_meters: 1 } },
    {
      $project: {
        _id: 1,
        name: 1,
        avg_rating: 1,
        lat: 1,
        lng: 1,
        distance_km: { $divide: ['$distance_meters', 1000] }
      }
    }
  ]);

  return {
    restaurants: results.map((restaurant) => ({
      id: restaurant._id,
      name: restaurant.name,
      distance_km: Number(restaurant.distance_km.toFixed(2)),
      avg_rating: restaurant.avg_rating,
      lat: restaurant.lat,
      lng: restaurant.lng
    }))
  };
};

module.exports = {
  getNearbyRestaurants
};
