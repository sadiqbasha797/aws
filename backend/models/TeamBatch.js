const mongoose = require('mongoose');

const teamBatchSchema = new mongoose.Schema({
  batchName: {
    type: String,
    trim: true,
    maxlength: [100, 'Batch name cannot exceed 100 characters']
  },
  batchNumber: {
    type: String,
    trim: true,
    unique: true,
    sparse: true // Allows multiple null values but ensures uniqueness for non-null values
  },
  batchDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Batch description cannot exceed 500 characters']
  },
  batchMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeamMember'
  }],
  createdBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manager'
    },
    name: {
      type: String
    },
    email: {
      type: String
    }
  },
  batchImage: {
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
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed'],
    default: 'active'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Index for better query performance
teamBatchSchema.index({ batchName: 1 });
teamBatchSchema.index({ batchNumber: 1 });
teamBatchSchema.index({ 'createdBy.userId': 1 });
teamBatchSchema.index({ status: 1 });
teamBatchSchema.index({ createdAt: -1 });

// Virtual for member count
teamBatchSchema.virtual('memberCount').get(function() {
  return this.batchMembers.length;
});

// Virtual to check if batch has image
teamBatchSchema.virtual('hasImage').get(function() {
  return !!(this.batchImage && this.batchImage.s3Key);
});

// Pre-save middleware to generate batch number if not provided
teamBatchSchema.pre('save', async function(next) {
  if (this.isNew && !this.batchNumber) {
    // Generate batch number: BATCH-YYYY-XXXX format
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      batchNumber: { $regex: `^BATCH-${year}-` }
    });
    this.batchNumber = `BATCH-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Method to add team member to batch
teamBatchSchema.methods.addMember = function(memberId) {
  if (!this.batchMembers.includes(memberId)) {
    this.batchMembers.push(memberId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove team member from batch
teamBatchSchema.methods.removeMember = function(memberId) {
  this.batchMembers = this.batchMembers.filter(id => !id.equals(memberId));
  return this.save();
};

// Method to update batch image
teamBatchSchema.methods.updateImage = function(imageData) {
  this.batchImage = imageData;
  return this.save();
};

// Method to remove batch image
teamBatchSchema.methods.removeImage = function() {
  this.batchImage = undefined;
  return this.save();
};

// Static method to find batches by creator
teamBatchSchema.statics.findByCreator = function(managerId) {
  return this.find({ 'createdBy.userId': managerId });
};

// Static method to find active batches
teamBatchSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

// Static method to find batches with specific member
teamBatchSchema.statics.findByMember = function(memberId) {
  return this.find({ batchMembers: memberId });
};

// Static method to get batch statistics
teamBatchSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalMembers: { $sum: { $size: '$batchMembers' } }
      }
    }
  ]);
  
  const totalBatches = await this.countDocuments();
  
  return {
    totalBatches,
    statusBreakdown: stats,
    averageMembersPerBatch: stats.reduce((acc, stat) => acc + stat.totalMembers, 0) / totalBatches || 0
  };
};

module.exports = mongoose.model('TeamBatch', teamBatchSchema);
