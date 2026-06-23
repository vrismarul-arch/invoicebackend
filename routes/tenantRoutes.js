const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { protect, adminOnly } = require('../middleware/auth');
const {
  createOrUpdateTenant,
  updateTenantById,
  getMyTenant,
  getTenantStatus,
  getAllTenants,
  getTenantById,
  deleteTenant,
  getTenantStats
} = require('../controllers/tenantController');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
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

// ============ PUBLIC ROUTES (No auth required) ============
// Remove these if you want all routes to be protected

// ============ PROTECTED ROUTES (Auth required) ============
// All routes below require authentication
router.use(protect);

// GET /api/tenants - Get all tenants (admin only)
router.get('/', adminOnly, getAllTenants);

// GET /api/tenants/status - Get tenant status
router.get('/status', getTenantStatus);

// GET /api/tenants/me - Get my tenant details
router.get('/me', getMyTenant);

// GET /api/tenants/:id - Get tenant by ID
router.get('/:id', getTenantById);

// PUT /api/tenants/:id - Update tenant by ID
router.put('/:id', upload.single('logo'), updateTenantById);

// DELETE /api/tenants/:id - Delete tenant (admin only)
router.delete('/:id', adminOnly, deleteTenant);

// GET /api/tenants/:id/stats - Get tenant stats
router.get('/:id/stats', getTenantStats);

// POST /api/tenants - Create or update tenant
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