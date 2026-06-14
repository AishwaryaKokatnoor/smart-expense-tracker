const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const SavingGoal = require('../models/SavingGoal');

// All routes require authentication
router.use(protect);

// @route   GET /api/savings/goals
// @desc    Get all savings goals
router.get('/goals', async (req, res) => {
  try {
    const goals = await SavingGoal.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, goals });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
});

// @route   POST /api/savings/goals
// @desc    Create a savings goal
router.post('/goals', async (req, res) => {
  try {
    const { goalName, targetAmount, deadline, category } = req.body;
    
    console.log('Creating goal for user:', req.user.id);
    console.log('Goal data:', { goalName, targetAmount, deadline, category });
    
    if (!goalName || !targetAmount || !deadline) {
      return res.status(400).json({ 
        message: 'Please provide goalName, targetAmount, and deadline', 
        success: false 
      });
    }
    
    const goal = await SavingGoal.create({
      userId: req.user.id,
      goalName,
      targetAmount: Number(targetAmount),
      deadline: new Date(deadline),
      category: category || 'Other',
      currentAmount: 0,
      status: 'active'
    });
    
    console.log('Goal created:', goal);
    
    res.status(201).json({ success: true, goal });
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ message: error.message || 'Server error', success: false });
  }
});

// @route   PUT /api/savings/goals/:id
// @desc    Update a savings goal
router.put('/goals/:id', async (req, res) => {
  try {
    let goal = await SavingGoal.findById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found', success: false });
    }
    
    if (goal.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized', success: false });
    }
    
    goal = await SavingGoal.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, goal });
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
});

// @route   POST /api/savings/goals/:id/add-money
// @desc    Add money to a savings goal
router.post('/goals/:id/add-money', async (req, res) => {
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
    
    goal.currentAmount += Number(amount);
    
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
});

// @route   DELETE /api/savings/goals/:id
// @desc    Delete a savings goal
router.delete('/goals/:id', async (req, res) => {
  try {
    const goal = await SavingGoal.findById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found', success: false });
    }
    
    if (goal.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized', success: false });
    }
    
    await goal.deleteOne();
    res.json({ success: true, message: 'Goal deleted' });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
});

module.exports = router;