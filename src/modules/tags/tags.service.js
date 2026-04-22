const mongoose = require('mongoose');
const Tag = require('./tag.model');
const { createApiError } = require('../auth/auth.service');

const ALLOWED_TYPES = ['cuisine', 'dietary', 'feature'];

const getApprovedTags = async (type) => {
  const filter = { status: 'approved' };

  if (type !== undefined) {
    if (!ALLOWED_TYPES.includes(type)) {
      throw createApiError(400, 'TAGS_INVALID_TYPE', 'VALIDATION_ERROR', 'Invalid tag type.');
    }
    filter.type = type;
  }

  const tags = await Tag.find(filter).sort({ usage_count: -1, name_lower: 1 });

  return {
    tags: tags.map((tag) => ({
      id: tag._id,
      name: tag.name,
      type: tag.type,
      usage_count: tag.usage_count
    }))
  };
};

const createTag = async (user, payload) => {
  if (!user || !user.id) {
    throw createApiError(401, 'AUTH_UNAUTHORIZED', 'AUTH_ERROR', 'Unauthorized.');
  }

  const { name, type } = payload;

  if (!name || String(name).trim() === '') {
    throw createApiError(400, 'TAGS_NAME_REQUIRED', 'VALIDATION_ERROR', 'name is required.');
  }

  if (!type || !ALLOWED_TYPES.includes(type)) {
    throw createApiError(400, 'TAGS_INVALID_TYPE', 'VALIDATION_ERROR', 'type must be cuisine, dietary, or feature.');
  }

  const normalizedName = String(name).trim();
  const nameLower = normalizedName.toLowerCase();

  const existing = await Tag.findOne({ name_lower: nameLower });
  if (existing) {
    throw createApiError(409, 'TAGS_ALREADY_EXISTS', 'CONFLICT_ERROR', 'Tag already exists.');
  }

  const status = user.role === 'admin' ? 'approved' : 'pending';

  try {
    const tag = await Tag.create({
      name: normalizedName,
      type,
      status,
      created_by: user.id,
      usage_count: 0
    });

    return {
      id: tag._id,
      name: tag.name,
      type: tag.type,
      status: tag.status,
      created_at: tag.createdAt
    };
  } catch (err) {
    if (err && err.code === 11000) {
      throw createApiError(409, 'TAGS_ALREADY_EXISTS', 'CONFLICT_ERROR', 'Tag already exists.');
    }
    throw err;
  }
};

const assignTagToRestaurant = async (restaurant, tagId) => {
  if (!tagId) {
    throw createApiError(400, 'TAGS_TAG_ID_REQUIRED', 'VALIDATION_ERROR', 'tag_id is required.');
  }

  if (!mongoose.Types.ObjectId.isValid(tagId)) {
    throw createApiError(404, 'TAGS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Tag not found.');
  }

  const tag = await Tag.findById(tagId);
  if (!tag) {
    throw createApiError(404, 'TAGS_NOT_FOUND', 'NOT_FOUND_ERROR', 'Tag not found.');
  }

  const tagNameLower = String(tag.name).trim().toLowerCase();
  const alreadyAssigned = Array.isArray(restaurant.tags)
    ? restaurant.tags.some((t) => String(t).toLowerCase() === tagNameLower)
    : false;

  if (alreadyAssigned) {
    throw createApiError(409, 'TAGS_ALREADY_ASSIGNED', 'CONFLICT_ERROR', 'Tag already assigned to restaurant.');
  }

  restaurant.tags = Array.isArray(restaurant.tags) ? restaurant.tags : [];
  restaurant.tags.push(tag.name);
  await restaurant.save();

  await Tag.updateOne({ _id: tag._id }, { $inc: { usage_count: 1 } });

  return {
    message: 'Tag assigned successfully.',
    restaurant_id: restaurant._id,
    tag: {
      id: tag._id,
      name: tag.name,
      type: tag.type
    }
  };
};

module.exports = {
  getApprovedTags,
  createTag,
  assignTagToRestaurant
};
