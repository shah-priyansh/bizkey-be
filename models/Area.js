const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  stateId: {
    type: String,
    required: true,
    trim: true
  },
  cityId: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
}, {
  timestamps: true
});

// Index for efficient queries
areaSchema.index({ name: 1, city: 1, state: 1 });

module.exports = mongoose.model('Area', areaSchema);
