const express = require('express');
const router = express.Router({ mergeParams: true });
const Restaurant = require('../restaurants/restaurant.model');
const { authenticate } = require('../../middleware/auth.middleware');
const { loadResource, requireOwnership } = require('../../middleware/ownership.middleware');
const {
  listDishes,
  addDish,
  updateDish,
  deleteDish
} = require('./dishes.controller');

router.use(loadResource({
  model: Restaurant,
  paramId: 'id',
  attachAs: 'restaurant',
  notFoundCode: 'RESTAURANTS_NOT_FOUND',
  notFoundMessage: 'Restaurant not found.',
  additionalQuery: { status: { $ne: 'deleted' } }
}));

router.get('/', listDishes);
router.post('/', authenticate, requireOwnership({
  resourceKey: 'restaurant',
  ownerField: 'owner_id',
  forbiddenCode: 'RESTAURANTS_FORBIDDEN',
  forbiddenMessage: 'Not the owner or admin.'
}), addDish);
router.put('/:dish_id', authenticate, requireOwnership({
  resourceKey: 'restaurant',
  ownerField: 'owner_id',
  forbiddenCode: 'RESTAURANTS_FORBIDDEN',
  forbiddenMessage: 'Not the owner or admin.'
}), updateDish);
router.delete('/:dish_id', authenticate, requireOwnership({
  resourceKey: 'restaurant',
  ownerField: 'owner_id',
  forbiddenCode: 'RESTAURANTS_FORBIDDEN',
  forbiddenMessage: 'Not the owner or admin.'
}), deleteDish);

module.exports = router;
