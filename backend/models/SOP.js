const mongoose = require('mongoose');

const sopSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  process: {
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
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft'
  },
  version: {
    type: Number,
    default: 1
  },
  // Versioning System
  parentSOPId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SOP',
    default: null  // null for original SOP (v1)
  },
  versionNumber: {
    type: Number,
    default: 1
  },
  isParentVersion: {
    type: Boolean,
    default: true  // First version is always parent
  },
  versionHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SOP'
  }],
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
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Index for better query performance
sopSchema.index({ title: 1 });
sopSchema.index({ 'createdBy.userId': 1 });
sopSchema.index({ status: 1 });
sopSchema.index({ createdAt: -1 });
// Versioning indexes
sopSchema.index({ parentSOPId: 1 });
sopSchema.index({ versionNumber: 1 });
sopSchema.index({ isParentVersion: 1 });
sopSchema.index({ isDeleted: 1 });

// Virtual for document count
sopSchema.virtual('documentCount').get(function() {
  return this.documents.length;
});

// Pre-save middleware to update version on modification
sopSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
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

// Static method to find active SOPs
sopSchema.statics.findActive = function() {
  return this.find({ status: 'active', isDeleted: false });
};

// Versioning Methods
sopSchema.methods.createNewVersion = async function(newVersionData, user) {
  const SOP = this.constructor;
  
  // Get the parent SOP (original or current parent)
  const parentSOP = this.parentSOPId ? await SOP.findById(this.parentSOPId) : this;
  
  // Find the highest version number in the version history
  const allVersions = await SOP.find({
    $or: [
      { _id: parentSOP._id },
      { parentSOPId: parentSOP._id }
    ],
    isDeleted: false
  }).sort({ versionNumber: -1 });
  
  const nextVersionNumber = allVersions.length > 0 ? allVersions[0].versionNumber + 1 : 1;
  
  // Create new version
  const newVersion = new SOP({
    ...newVersionData,
    parentSOPId: parentSOP._id,
    versionNumber: nextVersionNumber,
    isParentVersion: false,
    versionHistory: [],
    createdBy: {
      userId: user._id,
      userType: user.role === 'manager' ? 'Manager' : 'TeamMember',
      name: user.name,
      email: user.email
    },
    updatedBy: {
      userId: user._id,
      userType: user.role === 'manager' ? 'Manager' : 'TeamMember',
      name: user.name,
      email: user.email
    }
  });
  
  await newVersion.save();
  
  // Update parent's version history
  parentSOP.versionHistory.push(newVersion._id);
  await parentSOP.save();
  
  return newVersion;
};

sopSchema.methods.getAllVersions = function() {
  const SOP = this.constructor;
  const parentId = this.parentSOPId || this._id;
  
  return SOP.find({
    $or: [
      { _id: parentId },
      { parentSOPId: parentId }
    ],
    isDeleted: false
  }).sort({ versionNumber: 1 });
};

sopSchema.methods.getParentSOP = function() {
  if (!this.parentSOPId) return this;
  return this.constructor.findById(this.parentSOPId);
};

sopSchema.methods.promoteToParent = async function() {
  const SOP = this.constructor;
  
  // Remove parent status from current parent
  if (this.parentSOPId) {
    await SOP.findByIdAndUpdate(this.parentSOPId, { isParentVersion: false });
  }
  
  // Make this version the parent
  this.isParentVersion = true;
  this.parentSOPId = null;
  
  // Update all other versions to point to this as parent
  await SOP.updateMany(
    { parentSOPId: this.parentSOPId || this._id, _id: { $ne: this._id } },
    { parentSOPId: this._id }
  );
  
  return this.save();
};

// Static method to find non-deleted SOPs
sopSchema.statics.findNonDeleted = function(query = {}) {
  return this.find({ ...query, isDeleted: false });
};

module.exports = mongoose.model('SOP', sopSchema);
