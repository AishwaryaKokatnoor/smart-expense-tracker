const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes (order doesn't matter)
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/transactions', require('./routes/transaction.routes'));
app.use('/api/budgets', require('./routes/budget.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/savings', require('./routes/savingGoal.routes')); 
require('./services/recurring.service'); // Start recurring transaction service


// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Expense Tracker API is running' });
});

// Error handling middleware (should be last)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', success: false });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});