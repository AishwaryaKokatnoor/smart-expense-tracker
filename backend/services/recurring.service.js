const Transaction = require('../models/Transaction');
const moment = require('moment');

// Helper to get days based on frequency
const getFrequencyDays = (frequency) => {
  switch (frequency) {
    case 'daily': return 1;
    case 'weekly': return 7;
    case 'monthly': return 30;
    case 'yearly': return 365;
    default: return 0;
  }
};

// Check if should create new recurring transaction
const shouldCreateRecurringTransaction = (transaction, today) => {
  // If never created before
  if (!transaction.lastRecurringDate) return true;
  
  // Calculate days since last creation
  const daysSinceLast = moment(today).diff(moment(transaction.lastRecurringDate), 'days');
  const frequencyDays = getFrequencyDays(transaction.recurringFrequency);
  
  return daysSinceLast >= frequencyDays;
};

// Create a copy of the recurring transaction
const createRecurringTransactionCopy = async (parentTransaction, date) => {
  const newTransaction = new Transaction({
    userId: parentTransaction.userId,
    type: parentTransaction.type,
    category: parentTransaction.category,
    amount: parentTransaction.amount,
    description: `${parentTransaction.description} (Auto)`,
    date: date,
    isRecurring: false,
    parentTransactionId: parentTransaction._id
  });
  
  await newTransaction.save();
  console.log(`✅ Auto-created: ${newTransaction.description} - ₹${newTransaction.amount}`);
  return newTransaction;
};

// Main function to process all recurring transactions
const processRecurringTransactions = async () => {
  try {
    const today = new Date();
    
    // Find all active recurring transactions
    const recurringTransactions = await Transaction.find({
      isRecurring: true,
      recurringFrequency: { $ne: 'none' },
      $or: [
        { recurringEndDate: null },
        { recurringEndDate: { $gte: today } }
      ]
    });
    
    console.log(`🔄 Checking ${recurringTransactions.length} recurring transactions...`);
    
    let createdCount = 0;
    
    for (const parentTransaction of recurringTransactions) {
      const shouldCreate = shouldCreateRecurringTransaction(parentTransaction, today);
      
      if (shouldCreate) {
        await createRecurringTransactionCopy(parentTransaction, today);
        
        // Update last recurring date
        parentTransaction.lastRecurringDate = today;
        await parentTransaction.save();
        createdCount++;
      }
    }
    
    if (createdCount > 0) {
      console.log(`✅ Created ${createdCount} new recurring transactions`);
    }
    
  } catch (error) {
    console.error('❌ Error processing recurring transactions:', error);
  }
};

// Run every hour
setInterval(processRecurringTransactions, 60 * 60 * 1000);

// Run immediately on startup
processRecurringTransactions();

module.exports = { processRecurringTransactions };