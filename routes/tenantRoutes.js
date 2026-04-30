const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { 
  createOrUpdateTenant,
  getMyTenant,
  getTenantStatus,
  updateTenantById
} = require('../controllers/tenantController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Configure multer for memory storage (will upload to Supabase)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// All routes require authentication
router.use(protect);

// Get tenant status
router.get('/status', getTenantStatus);

// Get my tenant details
router.get('/me', getMyTenant);

// Update tenant by ID with file upload support
router.put('/:id', upload.single('logo'), updateTenantById);

// Create or update tenant with file upload support
router.post(
  '/',
  upload.single('logo'),
  [
    body('organization_name')
      .notEmpty()
      .withMessage('Organization name is required')
      .isLength({ min: 2, max: 255 })
      .withMessage('Organization name must be between 2 and 255 characters'),
    body('street_address')
      .notEmpty()
      .withMessage('Street address is required'),
    body('district')
      .notEmpty()
      .withMessage('District is required'),
    body('gst_number')
      .optional({ nullable: true, checkFalsy: true })
      .isString()
  ],
  createOrUpdateTenant
);

module.exports = router;