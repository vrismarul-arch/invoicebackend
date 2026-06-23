// controllers/templateController.js - Complete with UPI Support

const { Op } = require('sequelize');
const { uploadToSupabase, deleteFromSupabase } = require('../middleware/upload');
const Template = require('../models/Template');

console.log('✅ Template model loaded in controller:', !!Template);

// ============ HELPER FUNCTIONS ============

// Parse JSON safely
const parseJSON = (value) => {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } 
    catch (e) { return value; }
  }
  return value;
};

// Default values
const DEFAULT_COLORS = {
  primary: '#1F2937',
  accent: '#3B82F6',
  border: '#E5E7EB',
  text: '#111827',
  lightBg: '#F9FAFB',
  headingColor: '#1F2937',
  bodyColor: '#111827'
};

const DEFAULT_TYPOGRAPHY = {
  headingFont: 'Inter',
  bodyFont: 'Inter',
  headingSize: '28px',
  bodySize: '14px',
  headingWeight: '700',
  bodyWeight: '400',
  headingTransform: 'uppercase',
  bodyTransform: 'none',
  headingLetterSpacing: '1px',
  bodyLetterSpacing: '0px',
  headingLineHeight: '1.3',
  bodyLineHeight: '1.6'
};

const DEFAULT_SECTIONS = {
  showLogo: true,
  showCompanyDetails: true,
  showInvoiceNo: true,
  showDates: true,
  showBillTo: true,
  showItems: true,
  showNotes: true,
  showUpiQr: false
};

const DEFAULT_FONTS = {
  heading: 'Inter',
  body: 'Inter'
};

// ============ CONTROLLER FUNCTIONS ============

// @desc    Get all templates
// @route   GET /api/templates
// @access  Private
exports.getTemplates = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { page = 1, limit = 10, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

    const offset = (page - 1) * limit;
    const where = { tenant_id };

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { invoice_title: { [Op.like]: `%${search}%` } },
        { company_name: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Template.findAndCountAll({
      where,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch templates', 
      error: error.message 
    });
  }
};

// @desc    Get single template
// @route   GET /api/templates/:id
// @access  Private
exports.getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.user;

    const template = await Template.findOne({
      where: { id, tenant_id }
    });

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: template 
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch template', 
      error: error.message 
    });
  }
};

// @desc    Create template with UPI support
// @route   POST /api/templates
// @access  Private
exports.createTemplate = async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user;
    
    // Parse JSON fields from form-data
    const {
      name,
      companyName,
      companyLogoUrl,
      companyLogoPath,
      invoiceTitle,
      colors,
      fonts,
      typography,
      layout,
      sections,
      items,
      companyDetails,
      billToDetails,
      invoiceDetails,
      notes,
      upiDetails
    } = req.body;

    console.log('📝 Creating template for tenant:', tenant_id);
    console.log('📥 Received body keys:', Object.keys(req.body));

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Template name is required'
      });
    }

    // Handle logo upload if file is present
    let logoUrl = companyLogoUrl || '';
    let logoPath = companyLogoPath || '';

    if (req.file) {
      try {
        const uploadResult = await uploadToSupabase(req.file, 'templates');
        logoUrl = uploadResult.publicUrl;
        logoPath = uploadResult.filePath;
      } catch (uploadError) {
        console.error('Logo upload error:', uploadError);
      }
    }

    // Parse all JSON fields
    const parsedColors = parseJSON(colors);
    const parsedFonts = parseJSON(fonts);
    const parsedTypography = parseJSON(typography);
    const parsedSections = parseJSON(sections);
    const parsedItems = parseJSON(items);
    const parsedCompanyDetails = parseJSON(companyDetails);
    const parsedBillToDetails = parseJSON(billToDetails);
    const parsedInvoiceDetails = parseJSON(invoiceDetails);
    const parsedUpiDetails = parseJSON(upiDetails);

    // Build template data with proper defaults
    const templateData = {
      tenant_id,
      created_by: user_id,
      name,
      company_name: companyName || '',
      company_logo_url: logoUrl,
      company_logo_path: logoPath,
      invoice_title: invoiceTitle || 'INVOICE',
      
      // Colors with defaults
      colors: parsedColors || DEFAULT_COLORS,
      
      // Fonts (backward compatibility)
      fonts: parsedFonts || DEFAULT_FONTS,
      
      // ⭐ Typography (main font configuration)
      typography: parsedTypography || DEFAULT_TYPOGRAPHY,
      
      // Layout
      layout: layout || 'modern',
      
      // Sections
      sections: parsedSections || DEFAULT_SECTIONS,
      
      // Items
      items: Array.isArray(parsedItems) ? parsedItems : [],
      
      // Details
      company_details: parsedCompanyDetails || {},
      bill_to_details: parsedBillToDetails || {},
      invoice_details: parsedInvoiceDetails || {},
      
      // Notes
      notes: notes || '',
      
      // ⭐ UPI Details - Full Support
      upi_details: parsedUpiDetails || {}
    };

    console.log('📝 Template data prepared:', JSON.stringify({
      ...templateData,
      items_count: templateData.items.length
    }, null, 2));

    // Create template
    const template = await Template.create(templateData);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });
  } catch (error) {
    console.error('❌ Create template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create template', 
      error: error.message 
    });
  }
};

// @desc    Update template with UPI support
// @route   PUT /api/templates/:id
// @access  Private
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.user;
    
    const {
      name,
      companyName,
      companyLogoUrl,
      companyLogoPath,
      invoiceTitle,
      colors,
      fonts,
      typography,
      layout,
      sections,
      items,
      companyDetails,
      billToDetails,
      invoiceDetails,
      notes,
      upiDetails
    } = req.body;

    console.log('📝 Updating template:', id);
    console.log('📥 Received body keys:', Object.keys(req.body));

    // Find template
    const template = await Template.findOne({
      where: { id, tenant_id }
    });

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    // Handle logo upload if file is present
    let logoUrl = companyLogoUrl !== undefined ? companyLogoUrl : template.company_logo_url;
    let logoPath = companyLogoPath !== undefined ? companyLogoPath : template.company_logo_path;

    if (req.file) {
      // Delete old logo
      if (template.company_logo_path) {
        try {
          await deleteFromSupabase(template.company_logo_path);
        } catch (deleteError) {
          console.error('Delete old logo error:', deleteError);
        }
      }

      // Upload new logo
      try {
        const uploadResult = await uploadToSupabase(req.file, 'templates');
        logoUrl = uploadResult.publicUrl;
        logoPath = uploadResult.filePath;
      } catch (uploadError) {
        console.error('Logo upload error:', uploadError);
      }
    }

    // Parse all JSON fields
    const parsedColors = parseJSON(colors);
    const parsedFonts = parseJSON(fonts);
    const parsedTypography = parseJSON(typography);
    const parsedSections = parseJSON(sections);
    const parsedItems = parseJSON(items);
    const parsedCompanyDetails = parseJSON(companyDetails);
    const parsedBillToDetails = parseJSON(billToDetails);
    const parsedInvoiceDetails = parseJSON(invoiceDetails);
    const parsedUpiDetails = parseJSON(upiDetails);

    // Prepare update data
    const updateData = {
      name: name || template.name,
      company_name: companyName !== undefined ? companyName : template.company_name,
      company_logo_url: logoUrl,
      company_logo_path: logoPath,
      invoice_title: invoiceTitle || template.invoice_title,
      colors: parsedColors || template.colors,
      fonts: parsedFonts || template.fonts,
      typography: parsedTypography || template.typography,
      layout: layout || template.layout,
      sections: parsedSections || template.sections,
      items: Array.isArray(parsedItems) ? parsedItems : template.items,
      company_details: parsedCompanyDetails || template.company_details,
      bill_to_details: parsedBillToDetails || template.bill_to_details,
      invoice_details: parsedInvoiceDetails || template.invoice_details,
      notes: notes !== undefined ? notes : template.notes,
      upi_details: parsedUpiDetails || template.upi_details
    };

    console.log('📝 Update data prepared:', JSON.stringify({
      ...updateData,
      items_count: updateData.items.length
    }, null, 2));

    // Update template
    await template.update(updateData);

    // Fetch updated template
    const updatedTemplate = await Template.findByPk(id);

    res.status(200).json({
      success: true,
      message: 'Template updated successfully',
      data: updatedTemplate
    });
  } catch (error) {
    console.error('❌ Update template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update template', 
      error: error.message 
    });
  }
};

// @desc    Delete template
// @route   DELETE /api/templates/:id
// @access  Private
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.user;

    const template = await Template.findOne({
      where: { id, tenant_id }
    });

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    // Delete logo from Supabase if exists
    if (template.company_logo_path) {
      try {
        await deleteFromSupabase(template.company_logo_path);
      } catch (deleteError) {
        console.error('Delete logo error:', deleteError);
      }
    }

    await template.destroy();

    res.status(200).json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete template', 
      error: error.message 
    });
  }
};

// ============ ADDITIONAL UPI-RELATED FUNCTIONS ============

// @desc    Generate UPI QR for template preview
// @route   POST /api/templates/:id/generate-upi-qr
// @access  Private
exports.generateTemplateUpiQr = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.user;
    const { amount = 0, description } = req.body;

    const template = await Template.findOne({
      where: { id, tenant_id }
    });

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    const upiDetails = template.upi_details || {};
    
    if (!upiDetails.upiId) {
      return res.status(400).json({
        success: false,
        message: 'UPI ID is not configured in this template'
      });
    }

    const upiId = upiDetails.upiId;
    const payeeName = upiDetails.payeeName || template.company_name || '';
    const upiDescription = description || upiDetails.description || 'Invoice payment';
    const finalAmount = parseFloat(amount) || 0;

    // Generate UPI URL
    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${finalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(upiDescription)}`;
    
    // Generate QR code URL
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(upiUrl)}`;

    res.status(200).json({
      success: true,
      data: {
        upi_id: upiId,
        payee_name: payeeName,
        description: upiDescription,
        amount: finalAmount,
        upi_url: upiUrl,
        qr_url: qrUrl
      }
    });
  } catch (error) {
    console.error('Generate template UPI QR error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate UPI QR code', 
      error: error.message 
    });
  }
};

// @desc    Get template usage statistics (including UPI usage)
// @route   GET /api/templates/:id/stats
// @access  Private
exports.getTemplateStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.user;

    const template = await Template.findOne({
      where: { id, tenant_id }
    });

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    // Get invoice stats for this template
    const Invoice = require('../models/Invoice');
    
    const invoiceCount = await Invoice.count({
      where: {
        template_id: id,
        tenant_id
      }
    });

    const totalRevenue = await Invoice.sum('total_amount', {
      where: {
        template_id: id,
        tenant_id,
        status: 'paid'
      }
    });

    const upiInvoices = await Invoice.count({
      where: {
        template_id: id,
        tenant_id,
        upi_id: { [Op.not]: null }
      }
    });

    const upiPaid = await Invoice.count({
      where: {
        template_id: id,
        tenant_id,
        upi_payment_status: 'completed'
      }
    });

    res.status(200).json({
      success: true,
      data: {
        template_name: template.name,
        invoice_count: invoiceCount,
        total_revenue: totalRevenue || 0,
        upi_invoices: upiInvoices,
        upi_paid: upiPaid,
        has_upi: !!(template.upi_details?.upiId)
      }
    });
  } catch (error) {
    console.error('Get template stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get template statistics', 
      error: error.message 
    });
  }
};

// ============ BULK OPERATIONS ============

// @desc    Duplicate template (with all data including UPI)
// @route   POST /api/templates/:id/duplicate
// @access  Private
exports.duplicateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id, id: user_id } = req.user;
    const { name } = req.body;

    const template = await Template.findOne({
      where: { id, tenant_id }
    });

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    // Create duplicate
    const duplicateData = template.toJSON();
    delete duplicateData.id;
    delete duplicateData.created_at;
    delete duplicateData.updated_at;
    
    duplicateData.name = name || `${template.name} (Copy)`;
    duplicateData.created_by = user_id;
    duplicateData.tenant_id = tenant_id;

    const newTemplate = await Template.create(duplicateData);

    res.status(201).json({
      success: true,
      message: 'Template duplicated successfully',
      data: newTemplate
    });
  } catch (error) {
    console.error('Duplicate template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to duplicate template', 
      error: error.message 
    });
  }
};

// @desc    Bulk delete templates
// @route   DELETE /api/templates/bulk
// @access  Private
exports.bulkDeleteTemplates = async (req, res) => {
  try {
    const { ids } = req.body;
    const { tenant_id } = req.user;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Template IDs are required'
      });
    }

    const result = await Template.destroy({
      where: {
        id: { [Op.in]: ids },
        tenant_id
      }
    });

    res.status(200).json({
      success: true,
      message: `${result} templates deleted successfully`,
      data: { deleted: result }
    });
  } catch (error) {
    console.error('Bulk delete templates error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete templates', 
      error: error.message 
    });
  }
};

// ============ EXPORT ============
module.exports = {
  getTemplates: exports.getTemplates,
  getTemplateById: exports.getTemplateById,
  createTemplate: exports.createTemplate,
  updateTemplate: exports.updateTemplate,
  deleteTemplate: exports.deleteTemplate,
  generateTemplateUpiQr: exports.generateTemplateUpiQr,
  getTemplateStats: exports.getTemplateStats,
  duplicateTemplate: exports.duplicateTemplate,
  bulkDeleteTemplates: exports.bulkDeleteTemplates
};