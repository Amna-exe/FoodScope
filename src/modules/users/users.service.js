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

const getOwnProfile = async (userId) => {
  const user = await User.findById(userId).select('-password');

  if (!user) {
    throw createApiError(401, 'AUTH_UNAUTHORIZED', 'AUTH_ERROR', 'Unauthorized.');
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar_url: user.avatar_url || '',
    review_count: user.review_count || 0,
    bookmark_count: (user.bookmarks || []).length,
    created_at: user.createdAt
  };
};

const updateOwnProfile = async (userId, payload) => {
  const { name, avatar_url } = payload;

  if (name === undefined && avatar_url === undefined) {
    throw createApiError(400, 'USERS_INVALID_FIELDS', 'VALIDATION_ERROR', 'Provide at least one valid field.');
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw createApiError(400, 'USERS_INVALID_NAME', 'VALIDATION_ERROR', 'Name must be a non-empty string.');
    }
  }

  if (avatar_url !== undefined && typeof avatar_url !== 'string') {
    throw createApiError(400, 'USERS_INVALID_AVATAR', 'VALIDATION_ERROR', 'avatar_url must be a string.');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw createApiError(401, 'AUTH_UNAUTHORIZED', 'AUTH_ERROR', 'Unauthorized.');
  }

  if (name !== undefined) user.name = name.trim();
  if (avatar_url !== undefined) user.avatar_url = avatar_url.trim();

  await user.save();

  return {
    id: user._id,
    name: user.name,
    avatar_url: user.avatar_url || ''
  };
};

const getOwnBookmarks = async (userId, query) => {
  const user = await User.findById(userId).select('bookmarks');
  if (!user) {
    throw createApiError(401, 'AUTH_UNAUTHORIZED', 'AUTH_ERROR', 'Unauthorized.');
  }

  const page = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);
  const allBookmarks = Array.isArray(user.bookmarks) ? user.bookmarks : [];

  const sorted = [...allBookmarks].sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at));
  const startIndex = (page - 1) * limit;
  const paginated = sorted.slice(startIndex, startIndex + limit);

  return {
    bookmarks: paginated.map((bookmark) => ({
      restaurant_id: bookmark.restaurant_id,
      name: bookmark.name,
      avg_rating: bookmark.avg_rating,
      saved_at: bookmark.saved_at
    })),
    total: sorted.length,
    page
  };
};

const getOwnNotifications = async (userId, unreadOnly) => {
  const user = await User.findById(userId).select('notifications');
  if (!user) {
    throw createApiError(401, 'AUTH_UNAUTHORIZED', 'AUTH_ERROR', 'Unauthorized.');
  }

  const onlyUnread = String(unreadOnly).toLowerCase() === 'true';
  const notifications = Array.isArray(user.notifications) ? user.notifications : [];

  const filtered = onlyUnread
    ? notifications.filter((notification) => !notification.is_read)
    : notifications;

  const sorted = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return {
    notifications: sorted.map((notification) => ({
      id: notification._id,
      type: notification.type,
      message: notification.message,
      is_read: notification.is_read,
      created_at: notification.created_at
    }))
  };
};

const addNotification = async (userId, { type, message }) => {
  if (!type || !message) {
    throw createApiError(400, 'NOTIFICATIONS_INVALID', 'VALIDATION_ERROR', 'type and message are required.');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw createApiError(404, 'USERS_NOT_FOUND', 'NOT_FOUND_ERROR', 'User not found.');
  }

  user.notifications = Array.isArray(user.notifications) ? user.notifications : [];
  user.notifications.push({
    type: String(type),
    message: String(message),
    is_read: false,
    created_at: new Date()
  });

  await user.save();
  return true;
};

module.exports = {
  getOwnProfile,
  updateOwnProfile,
  getOwnBookmarks,
  getOwnNotifications,
  addNotification
};
