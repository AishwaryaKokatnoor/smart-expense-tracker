const Transaction = require('../models/Transaction');
const moment = require('moment');

// @desc    Get all transactions
// @route   GET /api/transactions
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id })
      .sort({ date: -1 });
    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

// @desc    Create a transaction
// @route   POST /api/transactions
const createTransaction = async (req, res) => {
  try {
    const { 
      type, 
      category, 
      amount, 
      description, 
      date, 
      isRecurring, 
      recurringFrequency, 
      recurringEndDate 
    } = req.body;
    
    const transactionData = {
      userId: req.user.id,
      type,
      category,
      amount: Number(amount),
      description,
      date: date || Date.now()
    };
    
    // If this is a recurring transaction template
    if (isRecurring) {
      transactionData.isRecurring = true;
      transactionData.recurringFrequency = recurringFrequency || 'monthly';
      if (recurringEndDate) {
        transactionData.recurringEndDate = new Date(recurringEndDate);
      }
    }
    
    const transaction = await Transaction.create(transactionData);
    
    res.status(201).json({ 
      success: true, 
      transaction,
      message: isRecurring ? 'Recurring transaction created successfully' : 'Transaction added successfully'
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
};
// @desc    Update transaction
// @route   PUT /api/transactions/:id
const updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found', success: false });
    }
    
    if (transaction.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized', success: false });
    }
    
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    res.json({ success: true, transaction: updatedTransaction });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found', success: false });
    }
    
    if (transaction.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized', success: false });
    }
    
    await transaction.deleteOne();
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

// @desc    Get dashboard summary
// @route   GET /api/transactions/summary/dashboard
const getDashboardSummary = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id });
    
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const recentTransactions = await Transaction.find({ userId: req.user.id })
      .sort({ date: -1 })
      .limit(5);
    
    res.json({
      success: true,
      summary: {
        totalIncome,
        totalExpenses,
        availableBalance: totalIncome - totalExpenses,
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

// @desc    Get category-wise expense analysis
// @route   GET /api/transactions/analysis/category
const getCategoryAnalysis = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month || moment().month() + 1;
    const currentYear = year || moment().year();

    const startDate = moment(`${currentYear}-${currentMonth}-01`).startOf('month').toDate();
    const endDate = moment(startDate).endOf('month').toDate();

    const expenses = await Transaction.find({
      userId: req.user.id,
      type: 'expense',
      date: { $gte: startDate, $lte: endDate }
    });

    const categoryData = expenses.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = 0;
      }
      acc[expense.category] += expense.amount;
      return acc;
    }, {});

    res.json({
      success: true,
      categoryData
    });
  } catch (error) {
    console.error('Category analysis error:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

// @desc    Get monthly comparison data
// @route   GET /api/transactions/analysis/monthly
const getMonthlyComparison = async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const endDate = moment().endOf('month');
    const startDate = moment().subtract(months - 1, 'months').startOf('month');

    const transactions = await Transaction.find({
      userId: req.user.id,
      date: { $gte: startDate.toDate(), $lte: endDate.toDate() }
    });

    const monthlyData = [];
    for (let i = 0; i < months; i++) {
      const monthStart = moment(startDate).add(i, 'months').startOf('month');
      const monthEnd = moment(monthStart).endOf('month');

      const monthTransactions = transactions.filter(t => {
        const tDate = moment(t.date);
        return tDate.isBetween(monthStart, monthEnd, null, '[]');
      });

      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      monthlyData.push({
        month: monthStart.format('MMM YYYY'),
        income,
        expenses,
        savings: income - expenses
      });
    }

    res.json({ success: true, monthlyData });
  } catch (error) {
    console.error('Monthly comparison error:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getDashboardSummary,
  getCategoryAnalysis,
  getMonthlyComparison
};