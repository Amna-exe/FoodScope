const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const {
  getAllRestaurants,
  getSingleRestaurant,
  createNewRestaurant,
  updateExistingRestaurant,
  removeRestaurant,
  bookmarkRestaurantById
} = require('./restaurants.controller');
const dishesRoutes = require('../dishes/dishes.routes');

router.get('/', getAllRestaurants);
router.get('/:id', getSingleRestaurant);
router.post('/', authenticate, createNewRestaurant);
router.put('/:id', authenticate, updateExistingRestaurant);
router.delete('/:id', authenticate, removeRestaurant);
router.post('/:id/bookmark', authenticate, bookmarkRestaurantById);
router.use('/:id/dishes', dishesRoutes);

module.exports = router;
