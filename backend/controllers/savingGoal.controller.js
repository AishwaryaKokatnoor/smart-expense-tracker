const SavingGoal = require('../models/SavingGoal');

// @desc    Get all savings goals
// @route   GET /api/savings/goals
const getGoals = async (req, res) => {
  try {
    const goals = await SavingGoal.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: goals.length,
      goals
    });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

// @desc    Create a savings goal
// @route   POST /api/savings/goals
const createGoal = async (req, res) => {
  try {
    const { goalName, targetAmount, deadline, category } = req.body;
    
    const goal = await SavingGoal.create({
      userId: req.user.id,
      goalName,
      targetAmount,
      deadline,
      category: category || 'Other'
    });
    
    res.status(201).json({
      success: true,
      goal
    });
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

// @desc    Update savings goal
// @route   PUT /api/savings/goals/:id
const updateGoal = async (req, res) => {
  try {
    let goal = await SavingGoal.findById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found', success: false });
    }
    
    if (goal.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized', success: false });
    }
    
    goal = await SavingGoal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      goal
    });
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

// @desc    Add money to savings goal
// @route   POST /api/savings/goals/:id/add-money
const addMoney = async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount', success: false });
    }
    
    const goal = await SavingGoal.findById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found', success: false });
    }
    
    if (goal.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized', success: false });
    }
    
    goal.currentAmount += amount;
    
    // Check if goal is achieved
    if (goal.currentAmount >= goal.targetAmount) {
      goal.status = 'achieved';
    }
    
    await goal.save();
    
    res.json({
      success: true,
      goal,
      message: `Added ₹${amount} to ${goal.goalName}`
    });
  } catch (error) {
    console.error('Add money error:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

// @desc    Delete savings goal
// @route   DELETE /api/savings/goals/:id
const deleteGoal = async (req, res) => {
  try {
    const goal = await SavingGoal.findById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found', success: false });
    }
    
    if (goal.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized', success: false });
    }
    
    await goal.deleteOne();
    
    res.json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

module.exports = {
  getGoals,
  createGoal,
  updateGoal,
  addMoney,
  deleteGoal
};