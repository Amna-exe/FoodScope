const mongoose = require('mongoose');

const TAG_TYPES = ['cuisine', 'dietary', 'feature'];
const TAG_STATUSES = ['pending', 'approved'];

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 64
  },
  name_lower: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: TAG_TYPES,
    index: true
  },
  status: {
    type: String,
    enum: TAG_STATUSES,
    default: 'pending',
    index: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  usage_count: {
    type: Number,
    default: 0,
    min: 0
  }
}, { timestamps: true });

tagSchema.pre('validate', function normalizeName(next) {
  if (this.name) {
    const normalized = String(this.name).trim();
    this.name = normalized;
    this.name_lower = normalized.toLowerCase();
  }
  next();
});

tagSchema.index({ name_lower: 1 }, { unique: true });

module.exports = mongoose.model('Tag', tagSchema);
