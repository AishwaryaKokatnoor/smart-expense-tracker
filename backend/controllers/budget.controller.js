const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const moment = require('moment');

// @desc    Get budget
// @route   GET /api/budgets
const getBudget = async (req, res) => {
  try {
    const currentMonth = moment().month() + 1;
    const currentYear = moment().year();
    
    const budget = await Budget.findOne({
      userId: req.user.id,
      month: currentMonth,
      year: currentYear
    });
    
    // Calculate current expenses
    const startDate = moment(`${currentYear}-${currentMonth}-01`).startOf('month').toDate();
    const endDate = moment(startDate).endOf('month').toDate();
    
    const expenses = await Transaction.find({
      userId: req.user.id,
      type: 'expense',
      date: { $gte: startDate, $lte: endDate }
    });
    
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    
    res.json({
      success: true,
      budget: budget || { monthlyBudget: 0 },
      totalExpenses,
      remainingBudget: budget ? budget.monthlyBudget - totalExpenses : 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', success: false });
  }
};

// @desc    Set budget
// @route   POST /api/budgets
const setBudget = async (req, res) => {
  try {
    const { monthlyBudget } = req.body;
    const currentMonth = moment().month() + 1;
    const currentYear = moment().year();
    
    let budget = await Budget.findOne({
      userId: req.user.id,
      month: currentMonth,
      year: currentYear
    });
    
    if (budget) {
      budget.monthlyBudget = monthlyBudget;
      await budget.save();
    } else {
      budget = await Budget.create({
        userId: req.user.id,
        monthlyBudget,
        month: currentMonth,
        year: currentYear
      });
    }
    
    res.json({ success: true, budget });
  } catch (error) {
    res.status(500).json({ message: 'Server error', success: false });
  }
};

module.exports = { getBudget, setBudget };