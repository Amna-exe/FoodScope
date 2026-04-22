const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 120
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  cuisine_type: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  price_range: {
    type: String,
    required: true,
    enum: ['$', '$$', '$$$'],
    index: true
  },
  avg_rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    index: true
  },
  address: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 300
  },
  lat: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  lng: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (coords) => Array.isArray(coords) && coords.length === 2,
        message: 'Location coordinates must be [lng, lat].'
      }
    }
  },
  tags: {
    type: [String],
    default: [],
    set: (value) => Array.isArray(value)
      ? value.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)
      : []
  },
  thumbnail: {
    type: String,
    default: ''
  },
  owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended', 'deleted'],
    default: 'pending',
    index: true
  },
  deleted_at: {
    type: Date,
    default: null
  }
}, { timestamps: true });

restaurantSchema.pre('validate', function syncLocation(next) {
  if (typeof this.lat === 'number' && typeof this.lng === 'number') {
    this.location = {
      type: 'Point',
      coordinates: [this.lng, this.lat]
    };
  }
  next();
});

restaurantSchema.index({ name: 'text', description: 'text' });
restaurantSchema.index({ location: '2dsphere' });
restaurantSchema.index({ name: 1, address: 1 }, { unique: true });
restaurantSchema.index({ cuisine_type: 1, price_range: 1, avg_rating: -1, status: 1 });
restaurantSchema.index({ tags: 1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);
