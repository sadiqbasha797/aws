const mongoose = require('mongoose');

const processSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Process name is required'],
    trim: true,
    maxlength: [200, 'Process name cannot exceed 200 characters'],
    unique: true
  }
}, {
  timestamps: true
});

// Index for better query performance
processSchema.index({ name: 1 });
processSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Process', processSchema);

