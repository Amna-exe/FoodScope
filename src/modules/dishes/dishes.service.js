const mongoose = require('mongoose');
const Dish = require('./dish.model');
const { createApiError } = require('../auth/auth.service');

const listDishesByRestaurant = async (restaurantId) => {
  const dishes = await Dish.find({ restaurant_id: restaurantId }).sort({ createdAt: -1 });

  return {
    dishes: dishes.map((dish) => ({
      id: dish._id,
      name: dish.name,
      description: dish.description,
      price: dish.price,
      dietary_tags: dish.dietary_tags,
      image_url: dish.image_url
    }))
  };
};

const createDishForRestaurant = async (restaurantId, payload) => {
  const { name, description, price, dietary_tags, image_url } = payload;

  if (!name || price === undefined) {
    throw createApiError(400, 'DISHES_MISSING_FIELDS', 'VALIDATION_ERROR', 'Missing name or price.');
  }

  const numericPrice = Number(price);
  if (Number.isNaN(numericPrice) || numericPrice <= 0) {
    throw createApiError(422, 'DISHES_INVALID_PRICE', 'VALIDATION_ERROR', 'Price must be a positive float.');
  }

  const dish = await Dish.create({
    name,
    description: description || '',
    price: numericPrice,
    dietary_tags: Array.isArray(dietary_tags) ? dietary_tags : [],
    image_url: image_url || '',
    restaurant_id: restaurantId
  });

  return {
    id: dish._id,
    name: dish.name,
    restaurant_id: dish.restaurant_id,
    created_at: dish.createdAt
  };
};

const updateDishForRestaurant = async (restaurantId, dishId, payload) => {
  if (!mongoose.Types.ObjectId.isValid(dishId)) {
    throw createApiError(404, 'DISHES_NOT_FOUND', 'NOT_FOUND_ERROR', 'Dish not found.');
  }

  const allowedFields = ['name', 'description', 'price', 'dietary_tags', 'image_url'];
  const providedFields = Object.keys(payload);
  const invalidFields = providedFields.filter((field) => !allowedFields.includes(field));

  if (providedFields.length === 0 || invalidFields.length > 0) {
    throw createApiError(400, 'DISHES_INVALID_FIELDS', 'VALIDATION_ERROR', 'Invalid fields.');
  }

  const dish = await Dish.findOne({ _id: dishId, restaurant_id: restaurantId });
  if (!dish) {
    throw createApiError(404, 'DISHES_NOT_FOUND', 'NOT_FOUND_ERROR', 'Dish not found.');
  }

  if (payload.price !== undefined) {
    const numericPrice = Number(payload.price);
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      throw createApiError(422, 'DISHES_INVALID_PRICE', 'VALIDATION_ERROR', 'Price must be a positive float.');
    }
    dish.price = numericPrice;
  }

  if (payload.name !== undefined) dish.name = payload.name;
  if (payload.description !== undefined) dish.description = payload.description;
  if (payload.dietary_tags !== undefined) {
    if (!Array.isArray(payload.dietary_tags)) {
      throw createApiError(400, 'DISHES_INVALID_FIELDS', 'VALIDATION_ERROR', 'dietary_tags must be an array.');
    }
    dish.dietary_tags = payload.dietary_tags;
  }
  if (payload.image_url !== undefined) dish.image_url = payload.image_url;

  await dish.save();

  return {
    id: dish._id,
    name: dish.name,
    updated_at: dish.updatedAt
  };
};

const deleteDishForRestaurant = async (restaurantId, dishId) => {
  if (!mongoose.Types.ObjectId.isValid(dishId)) {
    throw createApiError(404, 'DISHES_NOT_FOUND', 'NOT_FOUND_ERROR', 'Dish not found.');
  }

  const dish = await Dish.findOne({ _id: dishId, restaurant_id: restaurantId });
  if (!dish) {
    throw createApiError(404, 'DISHES_NOT_FOUND', 'NOT_FOUND_ERROR', 'Dish not found.');
  }

  await Dish.deleteOne({ _id: dish._id });

  return { message: 'Dish deleted.' };
};

module.exports = {
  listDishesByRestaurant,
  createDishForRestaurant,
  updateDishForRestaurant,
  deleteDishForRestaurant
};
