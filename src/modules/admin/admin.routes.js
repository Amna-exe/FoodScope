const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');

const {
  getUsers,
  patchRestaurantStatus,
  patchReviewModeration,
  getPlatformAnalytics
} = require('./admin.controller');

router.use(authenticate, requireRole('admin'));

router.get('/users', getUsers);
router.patch('/restaurants/:id/status', patchRestaurantStatus);
router.patch('/reviews/:id/moderate', patchReviewModeration);
router.get('/analytics', getPlatformAnalytics);

module.exports = router;
