const mongoose = require('mongoose');

const reliabilityDataSchema = new mongoose.Schema({
  workerId: {
    type: String,
    required: [true, 'Worker ID is required'],
    unique: true,
    trim: true,
    match: [/^[0-9]+$/, 'Worker ID should contain only numbers']
  },
  daId: {
    type: String,
    required: [true, 'DA ID is required'],
    trim: true,
    uppercase: true,
    match: [/^[a-zA-Z0-9]+$/, 'DA ID should contain only alphanumeric characters']
  },
  managerId: {
    type: String,
    required: [true, 'Manager ID is required'],
    trim: true,
    lowercase: true,
    match: [/^[a-zA-Z0-9]+$/, 'Manager ID should contain only alphanumeric characters']
  },
  processname: {
    type: String,
    required: [true, 'Process name is required'],
    trim: true,
    maxlength: [100, 'Process name cannot exceed 100 characters']
  },
  job_id: {
    type: String,
    required: [true, 'Job ID is required'],
    trim: true,
    unique: true,
    match: [/^[a-zA-Z0-9_-]+$/, 'Job ID should contain only alphanumeric characters, underscores, and hyphens']
  },
  totalTasks: {
    type: Number,
    required: [true, 'Total tasks is required'],
    min: [0, 'Total tasks cannot be negative']
  },
  totalOpportunities: {
    type: Number,
    required: [true, 'Total opportunities is required'],
    min: [0, 'Total opportunities cannot be negative']
  },
  totalSegmentsMatching: {
    type: Number,
    required: [true, 'Total segments matching is required'],
    min: [0, 'Total segments matching cannot be negative']
  },
  totalLabelMatching: {
    type: Number,
    required: [true, 'Total label matching is required'],
    min: [0, 'Total label matching cannot be negative']
  },
  totalDefects: {
    type: Number,
    required: [true, 'Total defects is required'],
    min: [0, 'Total defects cannot be negative']
  },
  overallReliabilityScore: {
    type: Number,
    required: [true, 'Overall reliability score is required'],
    min: [0, 'Reliability score cannot be less than 0'],
    max: [100, 'Reliability score cannot be more than 100']
  },
  // Additional calculated fields
  segmentAccuracy: {
    type: Number,
    min: [0, 'Segment accuracy cannot be less than 0'],
    max: [100, 'Segment accuracy cannot be more than 100']
  },
  labelAccuracy: {
    type: Number,
    min: [0, 'Label accuracy cannot be less than 0'],
    max: [100, 'Label accuracy cannot be more than 100']
  },
  defectRate: {
    type: Number,
    min: [0, 'Defect rate cannot be less than 0'],
    max: [100, 'Defect rate cannot be more than 100']
  },
  // Metadata
  period: {
    type: String,
    trim: true,
    default: 'monthly'
  },
  month: {
    type: Number,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    min: 2020,
    max: 2030
  },
  // Status fields
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for calculated segment accuracy
reliabilityDataSchema.virtual('calculatedSegmentAccuracy').get(function() {
  if (this.totalOpportunities === 0) return 0;
  return ((this.totalSegmentsMatching / this.totalOpportunities) * 100).toFixed(2);
});

// Virtual for calculated label accuracy
reliabilityDataSchema.virtual('calculatedLabelAccuracy').get(function() {
  if (this.totalOpportunities === 0) return 0;
  return ((this.totalLabelMatching / this.totalOpportunities) * 100).toFixed(2);
});

// Virtual for calculated defect rate
reliabilityDataSchema.virtual('calculatedDefectRate').get(function() {
  if (this.totalOpportunities === 0) return 0;
  return ((this.totalDefects / this.totalOpportunities) * 100).toFixed(2);
});

// Index for better query performance
reliabilityDataSchema.index({ workerId: 1 });
reliabilityDataSchema.index({ daId: 1 });
reliabilityDataSchema.index({ managerId: 1 });
reliabilityDataSchema.index({ processname: 1 });
reliabilityDataSchema.index({ job_id: 1 });
reliabilityDataSchema.index({ overallReliabilityScore: -1 });
reliabilityDataSchema.index({ year: -1, month: -1 });
reliabilityDataSchema.index({ isActive: 1 });

// Compound indexes for common queries
reliabilityDataSchema.index({ managerId: 1, isActive: 1 });
reliabilityDataSchema.index({ daId: 1, isActive: 1 });
reliabilityDataSchema.index({ year: 1, month: 1, managerId: 1 });

// Pre-save middleware to calculate and update accuracy fields
reliabilityDataSchema.pre('save', function(next) {
  // Calculate segment accuracy
  if (this.totalOpportunities > 0) {
    this.segmentAccuracy = parseFloat(((this.totalSegmentsMatching / this.totalOpportunities) * 100).toFixed(2));
    this.labelAccuracy = parseFloat(((this.totalLabelMatching / this.totalOpportunities) * 100).toFixed(2));
    this.defectRate = parseFloat(((this.totalDefects / this.totalOpportunities) * 100).toFixed(2));
  } else {
    this.segmentAccuracy = 0;
    this.labelAccuracy = 0;
    this.defectRate = 0;
  }

  // Update lastUpdated timestamp
  this.lastUpdated = new Date();
  next();
});

// Static method to get top performers
reliabilityDataSchema.statics.getTopPerformers = function(managerId, limit = 10) {
  return this.find({ managerId, isActive: true })
    .sort({ overallReliabilityScore: -1 })
    .limit(limit);
};

// Static method to get performance statistics
reliabilityDataSchema.statics.getPerformanceStats = function(managerId) {
  return this.aggregate([
    { $match: { managerId, isActive: true } },
    {
      $group: {
        _id: null,
        totalWorkers: { $sum: 1 },
        avgReliabilityScore: { $avg: '$overallReliabilityScore' },
        maxReliabilityScore: { $max: '$overallReliabilityScore' },
        minReliabilityScore: { $min: '$overallReliabilityScore' },
        totalTasks: { $sum: '$totalTasks' },
        totalOpportunities: { $sum: '$totalOpportunities' },
        totalDefects: { $sum: '$totalDefects' },
        avgSegmentAccuracy: { $avg: '$segmentAccuracy' },
        avgLabelAccuracy: { $avg: '$labelAccuracy' },
        avgDefectRate: { $avg: '$defectRate' }
      }
    }
  ]);
};

// Instance method to calculate performance grade
reliabilityDataSchema.methods.getPerformanceGrade = function() {
  if (this.overallReliabilityScore >= 95) return 'A+';
  if (this.overallReliabilityScore >= 90) return 'A';
  if (this.overallReliabilityScore >= 85) return 'B+';
  if (this.overallReliabilityScore >= 80) return 'B';
  if (this.overallReliabilityScore >= 75) return 'C+';
  if (this.overallReliabilityScore >= 70) return 'C';
  if (this.overallReliabilityScore >= 65) return 'D+';
  if (this.overallReliabilityScore >= 60) return 'D';
  return 'F';
};

module.exports = mongoose.model('ReliabilityData', reliabilityDataSchema);
