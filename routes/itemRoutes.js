// routes/itemRoutes.js

const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');

// GET
router.get('/', itemController.getAll);
router.get('/stats', itemController.getStats);
router.get('/categories', itemController.getCategories);
router.get('/:id', itemController.getById);

// POST
router.post('/', itemController.create);
router.post('/bulk-update', itemController.bulkUpdate);

// PUT
router.put('/:id', itemController.update);
router.put('/:id/stock', itemController.updateStock);

// DELETE
router.delete('/:id', itemController.delete);

module.exports = router;