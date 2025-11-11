const mongoose = require('mongoose');

const sopSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  process: {
    type: String,
    trim: true
  },
  sopUrl: {
    type: String,
    trim: true
  },
  documents: [{
    filename: {
      type: String
    },
    originalName: {
      type: String
    },
    s3Key: {
      type: String
    },
    s3Url: {
      type: String
    },
    fileSize: {
      type: Number
    },
    mimeType: {
      type: String
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'documents.uploadedBy.userType'
      },
      userType: {
        type: String,
        enum: ['TeamMember', 'Manager']
      },
      name: {
        type: String
      },
      email: {
        type: String
      }
    }
  }],
  createdBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'createdBy.userType'
    },
    userType: {
      type: String,
      enum: ['TeamMember', 'Manager']
    },
    name: {
      type: String
    },
    email: {
      type: String
    }
  },
  updatedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'updatedBy.userType'
    },
    userType: {
      type: String,
      enum: ['TeamMember', 'Manager']
    },
    name: {
      type: String
    },
    email: {
      type: String
    }
  },
  version: {
    type: Number,
    default: 1
  },
  // Soft Delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'deletedBy.userType'
    },
    userType: {
      type: String,
      enum: ['TeamMember', 'Manager']
    },
    name: {
      type: String
    },
    email: {
      type: String
    }
  },
}, {
  timestamps: true
});

// Index for better query performance
sopSchema.index({ title: 1 });
sopSchema.index({ 'createdBy.userId': 1 });
sopSchema.index({ createdAt: -1 });
sopSchema.index({ isDeleted: 1 });

// Virtual for document count
sopSchema.virtual('documentCount').get(function() {
  return this.documents.length;
});

// Pre-save middleware to update version on modification
sopSchema.pre('save', function(next) {
  // Only auto-increment version if it wasn't explicitly set in this update
  // If version was modified, it means it was set manually, so don't auto-increment
  if (this.isModified() && !this.isNew && !this.isModified('version')) {
    this.version += 1;
  }
  next();
});

// Method to add document
sopSchema.methods.addDocument = function(documentData) {
  this.documents.push(documentData);
  return this.save();
};

// Method to remove document
sopSchema.methods.removeDocument = function(documentId) {
  this.documents.id(documentId).remove();
  return this.save();
};

// Static method to find SOPs by creator
sopSchema.statics.findByCreator = function(userId, userType) {
  return this.find({
    'createdBy.userId': userId,
    'createdBy.userType': userType
  });
};

// Static method to find active SOPs (non-deleted)
sopSchema.statics.findActive = function() {
  return this.find({ isDeleted: false });
};

// Static method to find non-deleted SOPs
sopSchema.statics.findNonDeleted = function(query = {}) {
  return this.find({ ...query, isDeleted: false });
};

module.exports = mongoose.model('SOP', sopSchema);
