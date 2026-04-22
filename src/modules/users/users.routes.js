const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const {
  me,
  updateMe,
  meBookmarks,
  meNotifications
} = require('./users.controller');

router.get('/me', authenticate, me);
router.put('/me', authenticate, updateMe);
router.get('/me/bookmarks', authenticate, meBookmarks);
router.get('/me/notifications', authenticate, meNotifications);

module.exports = router;
