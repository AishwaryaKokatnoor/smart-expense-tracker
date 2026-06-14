const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getBudget, setBudget } = require('../controllers/budget.controller');

router.use(protect);
router.get('/', getBudget);
router.post('/', setBudget);

module.exports = router;