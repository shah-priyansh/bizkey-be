const mongoose = require('mongoose');

const clientFeedbackSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  lead: {
    type: String,
    enum: ['Red', 'Green', 'Orange'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  audio: {
    key: {
      type: String,
      trim: true
    },
    originalName: {
      type: String,
      trim: true
    }
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
clientFeedbackSchema.index({ client: 1, date: -1 });
clientFeedbackSchema.index({ lead: 1, date: -1 });
clientFeedbackSchema.index({ createdBy: 1, date: -1 });

module.exports = mongoose.model('ClientFeedback', clientFeedbackSchema);
