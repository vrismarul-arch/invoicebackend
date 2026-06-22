// routes/itemRoutes.js
const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');

// Simple middleware for development (no auth required yet)
const devAuth = (req, res, next) => {
  req.user = {
    // ✅ Use the REAL user ID from your database
    user_id: req.headers['x-user-id'] || '0af21ec1-9a41-4b02-93e2-cf99cee1f9a6',
    // ✅ Use the REAL tenant ID from your database
    tenant_id: req.headers['x-tenant-id'] || '8e3430e2-d907-400a-8175-62ffcde7e649',
    email: 'vrism@gmail.com',
    role: 'admin'
  };
  next();
};

// Apply dev auth middleware
router.use(devAuth);

// GET routes
router.get('/', itemController.getAll);
router.get('/stats', itemController.getStats);
router.get('/categories', itemController.getCategories);
router.get('/:id', itemController.getById);

// POST routes
router.post('/', itemController.create);
router.post('/bulk-update', itemController.bulkUpdate);

// PUT routes
router.put('/:id', itemController.update);
router.put('/:id/stock', itemController.updateStock);

// DELETE routes
router.delete('/:id', itemController.delete);

module.exports = router;