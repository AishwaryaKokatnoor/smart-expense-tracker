const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const moment = require('moment');
const PDFDocument = require('pdfkit');

router.use(protect);

// Generate monthly report (JSON)
router.get('/monthly/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
    const endDate = moment(startDate).endOf('month').toDate();
    
    const transactions = await Transaction.find({
      userId: req.user.id,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });
    
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const categoryBreakdown = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});
    
    res.json({
      success: true,
      report: {
        period: moment(startDate).format('MMMM YYYY'),
        summary: { income, expenses, savings: income - expenses },
        categoryBreakdown,
        transactions
      }
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
});

// Export to REAL PDF
router.get('/export/pdf/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    
    console.log(`Generating PDF for: ${year}-${month}`);
    
    // Create date range for the entire month
    const startDate = moment(`${year}-${month}-01`, 'YYYY-MM-DD').startOf('month').toDate();
    const endDate = moment(startDate).endOf('month').toDate();
    
    // Fetch transactions
    const transactions = await Transaction.find({
      userId: req.user.id,
      date: { 
        $gte: startDate, 
        $lte: endDate 
      }
    }).sort({ date: -1 });
    
    console.log(`Found ${transactions.length} transactions`);
    
    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Create PDF document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=expense_report_${year}_${month}.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Add Header
    doc.fontSize(25)
       .fillColor('#4CAF50')
       .text('💰 Smart Expense Tracker', { align: 'center' });
    
    doc.moveDown();
    doc.fontSize(16)
       .fillColor('#333333')
       .text('Monthly Financial Report', { align: 'center' });
    
    doc.fontSize(14)
       .fillColor('#666666')
       .text(moment(startDate).format('MMMM YYYY'), { align: 'center' });
    
    doc.moveDown(2);
    
    // Add Summary Section
    doc.fontSize(16)
       .fillColor('#333333')
       .text('Summary', { underline: true });
    
    doc.moveDown(0.5);
    
    // Summary box
    const startY = doc.y;
    doc.fontSize(12);
    
    doc.fillColor('#28a745')
       .text(`Total Income: ₹${totalIncome.toFixed(2)}`, 50, startY);
    
    doc.fillColor('#dc3545')
       .text(`Total Expenses: ₹${totalExpenses.toFixed(2)}`, 50, startY + 25);
    
    doc.fillColor('#007bff')
       .text(`Net Savings: ₹${(totalIncome - totalExpenses).toFixed(2)}`, 50, startY + 50);
    
    doc.moveDown(3);
    
    // Add Transactions Table
    doc.fillColor('#333333')
       .fontSize(14)
       .text('Transaction Details', { underline: true });
    
    doc.moveDown(0.5);
    
    // Table headers
    const tableTop = doc.y;
    const col1 = 50;      // Date
    const col2 = 130;     // Description
    const col3 = 330;     // Category
    const col4 = 430;     // Amount
    
    doc.fontSize(10)
       .fillColor('#ffffff')
       .rect(50, tableTop, 500, 25)
       .fill('#4CAF50');
    
    doc.fillColor('#ffffff')
       .text('Date', col1 + 5, tableTop + 8)
       .text('Description', col2 + 5, tableTop + 8)
       .text('Category', col3 + 5, tableTop + 8)
       .text('Amount', col4 + 5, tableTop + 8);
    
    let currentY = tableTop + 25;
    
    if (transactions.length === 0) {
      doc.fillColor('#999999')
         .text('No transactions found for this period', 50, currentY + 10);
    } else {
      transactions.forEach((t, index) => {
        const rowColor = index % 2 === 0 ? '#f9f9f9' : '#ffffff';
        doc.fillColor(rowColor)
           .rect(50, currentY, 500, 25)
           .fill();
        
        doc.fillColor(t.type === 'income' ? '#28a745' : '#dc3545')
           .fontSize(9)
           .text(moment(t.date).format('DD/MM/YYYY'), col1 + 5, currentY + 8)
           .text(t.description.substring(0, 30), col2 + 5, currentY + 8)
           .text(t.category, col3 + 5, currentY + 8)
           .text(`${t.type === 'income' ? '+' : '-'} ₹${t.amount.toFixed(2)}`, col4 + 5, currentY + 8);
        
        currentY += 25;
        
        // Add new page if needed
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }
      });
    }
    
    // Add Footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fillColor('#999999')
         .fontSize(8)
         .text(
           `Generated on ${moment().format('DD/MM/YYYY HH:mm:ss')} | Page ${i + 1} of ${pageCount}`,
           50,
           doc.page.height - 50,
           { align: 'center' }
         );
    }
    
    // Finalize PDF
    doc.end();
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ 
      message: 'Failed to generate PDF', 
      error: error.message,
      success: false 
    });
  }
});

// Export to CSV
router.get('/export/csv/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
    const endDate = moment(startDate).endOf('month').toDate();
    
    const transactions = await Transaction.find({
      userId: req.user.id,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });
    
    // Create CSV content
    let csvContent = 'Date,Description,Category,Type,Amount\n';
    
    transactions.forEach(t => {
      csvContent += `${moment(t.date).format('YYYY-MM-DD')},${t.description},${t.category},${t.type},${t.amount}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=expense_report_${year}_${month}.csv`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
});

module.exports = router;