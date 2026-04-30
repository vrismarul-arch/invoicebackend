const express = require('express');
const { body } = require('express-validator');
const { 
  createInvoice, 
  getInvoices, 
  getInvoice, 
  updateInvoice, 
  deleteInvoice,
  sendInvoice,
  markAsPaid,
  getInvoiceStats
} = require('../controllers/invoiceController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Statistics route
router.get('/stats/summary', getInvoiceStats);

// CRUD routes
router.post(
  '/',
  [
    body('client_name')
      .notEmpty()
      .withMessage('Client name is required'),
    body('client_email')
      .isEmail()
      .withMessage('Valid client email is required'),
    body('amount')
      .isNumeric()
      .withMessage('Amount must be a number')
      .isFloat({ min: 0 })
      .withMessage('Amount must be greater than 0'),
    body('due_date')
      .isISO8601()
      .withMessage('Valid due date is required')
      .custom(value => {
        if (new Date(value) < new Date()) {
          throw new Error('Due date must be in the future');
        }
        return true;
      })
  ],
  createInvoice
);

router.get('/', getInvoices);
router.get('/:id', getInvoice);
router.put('/:id', updateInvoice);
router.delete('/:id', deleteInvoice);

// Action routes
router.post('/:id/send', sendInvoice);
router.put('/:id/paid', markAsPaid);

module.exports = router;