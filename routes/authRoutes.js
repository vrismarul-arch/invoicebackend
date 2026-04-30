const express = require('express');
const { body } = require('express-validator');
const { 
  register, 
  login, 
  getMe, 
  logout,
  getMyOrganization
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post(
  '/register',
  [
    body('name')
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters'),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase and number'),
    body('company')
      .notEmpty()
      .withMessage('Company name is required')
  ],
  register
);

router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  login
);

// Protected routes
router.get('/me', protect, getMe);
router.get('/organization', protect, getMyOrganization);
router.post('/logout', protect, logout);

module.exports = router;