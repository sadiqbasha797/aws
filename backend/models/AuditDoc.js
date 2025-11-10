const mongoose = require('mongoose');

const auditDocSchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  process: {
    type: String,
    trim: true
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
auditDocSchema.index({ managerId: 1 });
auditDocSchema.index({ date: -1 });
auditDocSchema.index({ createdBy: 1 });
auditDocSchema.index({ isActive: 1 });
auditDocSchema.index({ managerId: 1, isActive: 1 });
auditDocSchema.index({ process: 1 });

module.exports = mongoose.model('AuditDoc', auditDocSchema);

