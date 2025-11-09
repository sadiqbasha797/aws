const mongoose = require('mongoose');

const quickLinkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  link: {
    type: String,
    required: [true, 'Link is required'],
    trim: true
  },
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
  }
}, {
  timestamps: true
});

// Index for better query performance
quickLinkSchema.index({ title: 1 });
quickLinkSchema.index({ 'createdBy.userId': 1 });
quickLinkSchema.index({ createdAt: -1 });

module.exports = mongoose.model('QuickLink', quickLinkSchema);

