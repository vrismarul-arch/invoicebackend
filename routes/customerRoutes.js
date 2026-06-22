const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Development Authentication Middleware
const devAuth = (req, res, next) => {
  req.user = {
    user_id: '0af21ec1-9a41-4b02-93e2-cf99cee1f9a6',
    tenant_id: '8e3430e2-d907-400a-8175-62ffcde7e649',
    email: 'vrism@gmail.com',
    role: 'admin'
  };
  next();
};

// Apply auth middleware to all routes
router.use(devAuth);

// Customer CRUD Routes
router.get('/', customerController.getAll);           // GET /api/customers
router.get('/stats', customerController.getStats);    // GET /api/customers/stats
router.get('/:id', customerController.getById);       // GET /api/customers/:id
router.post('/', customerController.create);          // POST /api/customers
router.put('/:id', customerController.update);        // PUT /api/customers/:id
router.delete('/:id', customerController.delete);     // DELETE /api/customers/:id

module.exports = router;