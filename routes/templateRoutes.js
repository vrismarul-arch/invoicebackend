// routes/templateRoutes.js
const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const templateController = require('../controllers/templateController');

// All routes require authentication
router.use(protect);

// Get all templates
router.get('/', templateController.getTemplates);

// Get single template
router.get('/:id', templateController.getTemplateById);

// Create template with logo upload
router.post('/', upload.single('logo'), templateController.createTemplate);

// Update template with logo upload
router.put('/:id', upload.single('logo'), templateController.updateTemplate);

// Delete template (admin only)
router.delete('/:id', adminOnly, templateController.deleteTemplate);

module.exports = router;