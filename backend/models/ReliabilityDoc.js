const mongoose = require('mongoose');

const reliabilityDocSchema = new mongoose.Schema({
  document: {
    filename: {
      type: String,
      required: [true, 'Document filename is required'],
      trim: true
    },
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true
    },
    s3Key: {
      type: String,
      required: [true, 'S3 key is required'],
      trim: true
    },
    s3Url: {
      type: String,
      required: [true, 'S3 URL is required'],
      trim: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    }
  },
  processname: {
    type: String,
    trim: true
  },
  job_id: {
    type: String,
    trim: true
  },
  year: {
    type: Number
  },
  month: {
    type: Number
  },
  createdBy: {
    type: String,
    required: [true, 'Created by is required'],
    trim: true
  },
  managerId: {
    type: String,
    required: [true, 'Manager ID is required'],
    trim: true
  },
  // Status fields
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true, // This automatically adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
reliabilityDocSchema.index({ managerId: 1 });
reliabilityDocSchema.index({ createdAt: -1 });
reliabilityDocSchema.index({ createdBy: 1 });
reliabilityDocSchema.index({ isActive: 1 });
reliabilityDocSchema.index({ managerId: 1, isActive: 1 });
reliabilityDocSchema.index({ processname: 1 });
reliabilityDocSchema.index({ job_id: 1 });

module.exports = mongoose.model('ReliabilityDoc', reliabilityDocSchema);

