const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getDashboardSummary,
  getCategoryAnalysis,
  getMonthlyComparison
} = require('../controllers/transaction.controller');

// All routes require authentication
router.use(protect);

// Transaction CRUD
router.get('/', getTransactions);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

// Analytics routes
router.get('/summary/dashboard', getDashboardSummary);
router.get('/analysis/category', getCategoryAnalysis);
router.get('/analysis/monthly', getMonthlyComparison);

// Get all recurring transactions
router.get('/recurring/list', async (req, res) => {
  try {
    console.log('Fetching recurring transactions for user:', req.user.id);
    
    const recurring = await Transaction.find({
      userId: req.user.id,
      isRecurring: true,
      recurringFrequency: { $ne: 'none' }
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${recurring.length} recurring transactions`);
    
    res.json({ 
      success: true, 
      recurring: recurring || [] 
    });
  } catch (error) {
    console.error('Get recurring error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      recurring: [] 
    });
  }
});

module.exports = router;