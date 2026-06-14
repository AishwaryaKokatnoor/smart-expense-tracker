const mongoose = require('mongoose');

const savingGoalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  goalName: {
    type: String,
    required: [true, 'Goal name is required'],
    trim: true,
    maxlength: [100, 'Goal name cannot exceed 100 characters']
  },
  targetAmount: {
    type: Number,
    required: [true, 'Target amount is required'],
    min: [1, 'Target amount must be greater than 0']
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: [0, 'Current amount cannot be negative']
  },
  deadline: {
    type: Date,
    required: [true, 'Deadline is required']
  },
  category: {
    type: String,
    enum: ['Emergency Fund', 'Vacation', 'New Car', 'House', 'Education', 'Investment', 'Other'],
    default: 'Other'
  },
  status: {
    type: String,
    enum: ['active', 'achieved', 'failed'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
savingGoalSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Update status based on current amount vs target
savingGoalSchema.pre('save', function(next) {
  if (this.currentAmount >= this.targetAmount) {
    this.status = 'achieved';
  }
  next();
});

module.exports = mongoose.model('SavingGoal', savingGoalSchema);