const mongoose = require('mongoose');

const productivityDataSchema = new mongoose.Schema({
  teamManager: {
    type: String,
    required: [true, 'Team Manager is required'],
    trim: true,
    lowercase: true,
    match: [/^[a-zA-Z0-9]+$/, 'Team Manager should contain only alphanumeric characters']
  },
  associateName: {
    type: String,
    required: [true, 'Associate name is required'],
    trim: true,
    minlength: [2, 'Associate name must be at least 2 characters long'],
    maxlength: [50, 'Associate name cannot exceed 50 characters']
  },
  month: {
    type: String,
    required: [true, 'Month is required'],
    enum: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
  },
  week: {
    type: String,
    required: [true, 'Week is required'],
    trim: true,
    match: [/^Week \d+$/, 'Week should be in format "Week X"']
  },
  productivityPercentage: {
    type: Number,
    required: [true, 'Productivity percentage is required'],
    min: [0, 'Productivity percentage cannot be negative'],
    max: [500, 'Productivity percentage cannot exceed 500%']
  },
  // Additional fields for better tracking
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [2020, 'Year cannot be before 2020'],
    max: [2030, 'Year cannot be after 2030']
  },
  weekNumber: {
    type: Number,
    required: [true, 'Week number is required'],
    min: [1, 'Week number must be at least 1'],
    max: [53, 'Week number cannot exceed 53']
  },
  // Performance categories
  performanceCategory: {
    type: String,
    enum: ['Excellent', 'Good', 'Average', 'Below Average', 'Poor'],
    default: 'Average'
  },
  // Status fields
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  // Notes for additional context
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for performance grade
productivityDataSchema.virtual('performanceGrade').get(function() {
  if (this.productivityPercentage >= 120) return 'A+';
  if (this.productivityPercentage >= 110) return 'A';
  if (this.productivityPercentage >= 100) return 'B+';
  if (this.productivityPercentage >= 90) return 'B';
  if (this.productivityPercentage >= 80) return 'C+';
  if (this.productivityPercentage >= 70) return 'C';
  if (this.productivityPercentage >= 60) return 'D+';
  if (this.productivityPercentage >= 50) return 'D';
  return 'F';
});

// Virtual for performance status
productivityDataSchema.virtual('performanceStatus').get(function() {
  if (this.productivityPercentage >= 100) return 'Above Target';
  if (this.productivityPercentage >= 80) return 'On Target';
  return 'Below Target';
});

// Index for better query performance
productivityDataSchema.index({ teamManager: 1 });
productivityDataSchema.index({ associateName: 1 });
productivityDataSchema.index({ month: 1, year: 1 });
productivityDataSchema.index({ week: 1, year: 1 });
productivityDataSchema.index({ productivityPercentage: -1 });
productivityDataSchema.index({ isActive: 1 });

// Compound indexes for common queries
productivityDataSchema.index({ teamManager: 1, isActive: 1 });
productivityDataSchema.index({ associateName: 1, isActive: 1 });
productivityDataSchema.index({ year: 1, month: 1, teamManager: 1 });
productivityDataSchema.index({ year: 1, weekNumber: 1, teamManager: 1 });

// Helper function to get week number
Date.prototype.getWeek = function() {
  const onejan = new Date(this.getFullYear(), 0, 1);
  return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
};

// Pre-save middleware to calculate performance category
productivityDataSchema.pre('save', function(next) {
  // Calculate performance category based on productivity percentage
  if (this.productivityPercentage >= 120) {
    this.performanceCategory = 'Excellent';
  } else if (this.productivityPercentage >= 100) {
    this.performanceCategory = 'Good';
  } else if (this.productivityPercentage >= 80) {
    this.performanceCategory = 'Average';
  } else if (this.productivityPercentage >= 60) {
    this.performanceCategory = 'Below Average';
  } else {
    this.performanceCategory = 'Poor';
  }

  // Extract week number from week string
  if (this.week && this.week.startsWith('Week ')) {
    this.weekNumber = parseInt(this.week.replace('Week ', ''));
  }

  // Update lastUpdated timestamp
  this.lastUpdated = new Date();
  next();
});

// Static method to get top performers
productivityDataSchema.statics.getTopPerformers = function(teamManager, limit = 10, year = null, month = null) {
  const filter = { teamManager, isActive: true };
  if (year) filter.year = year;
  if (month) filter.month = month;

  return this.find(filter)
    .sort({ productivityPercentage: -1 })
    .limit(limit);
};

// Static method to get productivity statistics
productivityDataSchema.statics.getProductivityStats = function(teamManager, year = null, month = null) {
  const filter = { teamManager, isActive: true };
  if (year) filter.year = year;
  if (month) filter.month = month;

  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalAssociates: { $sum: 1 },
        avgProductivity: { $avg: '$productivityPercentage' },
        maxProductivity: { $max: '$productivityPercentage' },
        minProductivity: { $min: '$productivityPercentage' },
        aboveTarget: {
          $sum: {
            $cond: [{ $gte: ['$productivityPercentage', 100] }, 1, 0]
          }
        },
        onTarget: {
          $sum: {
            $cond: [
              { $and: [
                { $gte: ['$productivityPercentage', 80] },
                { $lt: ['$productivityPercentage', 100] }
              ]}, 1, 0
            ]
          }
        },
        belowTarget: {
          $sum: {
            $cond: [{ $lt: ['$productivityPercentage', 80] }, 1, 0]
          }
        }
      }
    }
  ]);
};

// Static method to get productivity by week
productivityDataSchema.statics.getProductivityByWeek = function(teamManager, year, weekNumber) {
  return this.find({
    teamManager,
    year,
    weekNumber,
    isActive: true
  }).sort({ productivityPercentage: -1 });
};

// Static method to get productivity by month
productivityDataSchema.statics.getProductivityByMonth = function(teamManager, year, month) {
  return this.find({
    teamManager,
    year,
    month,
    isActive: true
  }).sort({ productivityPercentage: -1 });
};

// Instance method to get performance trend
productivityDataSchema.methods.getPerformanceTrend = async function() {
  const previousWeek = await this.constructor.findOne({
    associateName: this.associateName,
    teamManager: this.teamManager,
    weekNumber: this.weekNumber - 1,
    year: this.year,
    isActive: true
  });

  if (!previousWeek) return 'No previous data';

  const difference = this.productivityPercentage - previousWeek.productivityPercentage;
  if (difference > 5) return 'Improving';
  if (difference < -5) return 'Declining';
  return 'Stable';
};

module.exports = mongoose.model('ProductivityData', productivityDataSchema);
