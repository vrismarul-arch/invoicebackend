// routes/invoiceRoutes.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice
} = require('../controllers/invoiceController');

const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Validation rules
const validateInvoice = [
  body('client_name').notEmpty().withMessage('Client name is required'),
  body('client_email').isEmail().withMessage('Valid client email is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('due_date').notEmpty().withMessage('Due date is required'),
];

// Get all invoices / Create invoice
router.route('/')
  .get(getInvoices)
  .post(validateInvoice, createInvoice);

// Single invoice routes
router.route('/:id')
  .get(getInvoiceById)
  .put(updateInvoice)
  .delete(deleteInvoice);

module.exports = router;