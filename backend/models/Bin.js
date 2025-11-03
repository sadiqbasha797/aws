const mongoose = require('mongoose');

const binSchema = new mongoose.Schema({
  // Original document information
  originalId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  collectionName: {
    type: String,
    required: true,
    enum: ['sops', 'documents', 'users'] // Extensible for future collections
  },
  
  // Complete original document data
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Deletion metadata
  deletedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'deletedBy.userType'
    },
    userType: {
      type: String,
      required: true,
      enum: ['TeamMember', 'Manager']
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    }
  },
  
  deletedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // Auto-expire after 30 days
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    },
    expires: 0 // MongoDB TTL index
  },
  
  // Restoration context
  restoreLocation: {
    // Parent document ID (for nested items like documents in SOPs)
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    // Position in array (for ordered items)
    position: {
      type: Number,
      default: null
    },
    // Additional metadata for complex restoration
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
  // Deletion reason (optional)
  deletionReason: {
    type: String,
    default: 'User deleted'
  },
  
  // Restoration status
  isRestored: {
    type: Boolean,
    default: false
  },
  restoredAt: {
    type: Date,
    default: null
  },
  restoredBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'restoredBy.userType'
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
}, {
  timestamps: true
});

// Indexes for performance
binSchema.index({ originalId: 1 });
binSchema.index({ collectionName: 1 });
binSchema.index({ 'deletedBy.userId': 1 });
binSchema.index({ deletedAt: -1 });
binSchema.index({ expiresAt: 1 });
binSchema.index({ isRestored: 1 });

// Virtual for days until expiry
binSchema.virtual('daysUntilExpiry').get(function() {
  const now = new Date();
  const diffTime = this.expiresAt - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Method to restore item
binSchema.methods.restore = async function(user) {
  const mongoose = require('mongoose');
  
  try {
    // Map collectionName to actual Mongoose model name
    const modelNameMap = {
      'sops': 'SOP',
      'documents': 'Document',
      'users': 'User',
      'teamMembers': 'TeamMember',
      'managers': 'Manager'
    };
    
    // Get the model name, defaulting to capitalized collectionName if not in map
    const modelName = modelNameMap[this.collectionName] || 
                     this.collectionName.charAt(0).toUpperCase() + this.collectionName.slice(1);
    
    // Get the target model - ensure it's loaded
    let targetModel;
    try {
      targetModel = mongoose.model(modelName);
    } catch (err) {
      // Model not registered, try to require it based on model name
      if (modelName === 'SOP') {
        require('./SOP');
        targetModel = mongoose.model('SOP');
      } else if (modelName === 'TeamMember') {
        require('./TeamMember');
        targetModel = mongoose.model('TeamMember');
      } else if (modelName === 'Manager') {
        require('./Manager');
        targetModel = mongoose.model('Manager');
      } else {
        throw new Error(`Model ${modelName} not found. Make sure the model is imported in your controller.`);
      }
    }
    
    // Prepare restoration data
    const restorationData = { ...this.data };
    delete restorationData._id; // Remove old ID to create new one
    
    // Handle special restoration logic based on collection type
    if (this.collectionName === 'sops') {
      // For SOPs, handle version relationships
      if (this.restoreLocation.parentId) {
        // Restore as child version
        restorationData.parentSOPId = this.restoreLocation.parentId;
      }
      // Clear soft delete flags
      restorationData.isDeleted = false;
      restorationData.deletedAt = null;
      restorationData.deletedBy = undefined;
    }
    
    // Create restored document
    const restoredDoc = new targetModel(restorationData);
    await restoredDoc.save();
    
    // Update bin record
    this.isRestored = true;
    this.restoredAt = new Date();
    this.restoredBy = {
      userId: user._id,
      userType: user.role === 'manager' ? 'Manager' : 'TeamMember',
      name: user.name,
      email: user.email
    };
    
    await this.save();
    
    return restoredDoc;
  } catch (error) {
    throw new Error(`Failed to restore ${this.collectionName}: ${error.message}`);
  }
};

// Static method to soft delete any document
binSchema.statics.softDelete = async function(originalDoc, collectionName, user, options = {}) {
  const binItem = new this({
    originalId: originalDoc._id,
    collectionName: collectionName,
    data: originalDoc.toObject(),
    deletedBy: {
      userId: user._id,
      userType: user.role === 'manager' ? 'Manager' : 'TeamMember',
      name: user.name,
      email: user.email
    },
    restoreLocation: {
      parentId: options.parentId || null,
      position: options.position || null,
      metadata: options.metadata || {}
    },
    deletionReason: options.reason || 'User deleted'
  });
  
  return binItem.save();
};

// Static method to find items by user
binSchema.statics.findByUser = function(userId, userType) {
  return this.find({
    'deletedBy.userId': userId,
    'deletedBy.userType': userType,
    isRestored: false
  }).sort({ deletedAt: -1 });
};

// Static method to find expiring items
binSchema.statics.findExpiringSoon = function(days = 7) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  
  return this.find({
    expiresAt: { $lte: expiryDate },
    isRestored: false
  }).sort({ expiresAt: 1 });
};

module.exports = mongoose.model('Bin', binSchema);
