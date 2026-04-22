const Restaurant = require('../restaurants/restaurant.model');
const Dish = require('../dishes/dish.model');
const { buildSearchQuery } = require('./search.helpers');

const searchData = async (queryParams) => {
  const {
    type,
    page,
    limit,
    text,
    regex,
    restaurantQuery,
    dishQuery
  } = buildSearchQuery(queryParams);

  const skip = (page - 1) * limit;
  const shouldSearchRestaurants = type === 'restaurant' || type === 'all';
  const shouldSearchDishes = type === 'dish' || type === 'all';

  let restaurants = [];
  let dishes = [];

  if (shouldSearchRestaurants) {
    const restaurantFilter = {
      ...restaurantQuery,
      $or: [
        { $text: { $search: text } },
        { name: regex },
        { description: regex },
        { cuisine_type: regex },
        { tags: regex }
      ]
    };

    restaurants = await Restaurant.find(restaurantFilter)
      .sort({ score: { $meta: 'textScore' }, avg_rating: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name description cuisine_type tags price_range avg_rating address thumbnail');
  }

  if (shouldSearchDishes) {
    const dishFilter = {
      ...dishQuery,
      $or: [
        { name: regex },
        { description: regex }
      ]
    };

    dishes = await Dish.find(dishFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name description price dietary_tags image_url restaurant_id');
  }

  return {
    restaurants: restaurants.map((restaurant) => ({
      id: restaurant._id,
      name: restaurant.name,
      description: restaurant.description,
      cuisine_type: restaurant.cuisine_type,
      tags: restaurant.tags,
      price_range: restaurant.price_range,
      avg_rating: restaurant.avg_rating,
      address: restaurant.address,
      thumbnail: restaurant.thumbnail
    })),
    dishes: dishes.map((dish) => ({
      id: dish._id,
      name: dish.name,
      description: dish.description,
      price: dish.price,
      dietary_tags: dish.dietary_tags,
      image_url: dish.image_url,
      restaurant_id: dish.restaurant_id
    })),
    total_results: restaurants.length + dishes.length
  };
};

module.exports = {
  searchData
};
