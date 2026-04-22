const mongoose = require('mongoose');

const ALLOWED_DIETARY_TAGS = [
  'vegan',
  'vegetarian',
  'halal',
  'kosher',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'keto',
  'low-carb'
];

const dishSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 120
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: 2000
  },
  price: {
    type: Number,
    required: true,
    min: [0.01, 'Price must be greater than 0.'],
    validate: {
      validator: (value) => Number.isFinite(value) && value > 0,
      message: 'Price must be a positive number.'
    }
  },
  dietary_tags: {
    type: [{
      type: String,
      enum: ALLOWED_DIETARY_TAGS
    }],
    default: []
  },
  image_url: {
    type: String,
    default: '',
    trim: true
  },
  
}, { timestamps: true });

dishSchema.index({ restaurant_id: 1 });

module.exports = mongoose.model('Dish', dishSchema);
