// controllers/templateController.js
const { Op } = require('sequelize');
const { uploadToSupabase, deleteFromSupabase } = require('../middleware/upload');

// Import Template directly instead of from models
const Template = require('../models/Template');

// Debug: Check if Template is loaded
console.log('✅ Template model loaded in controller:', !!Template);

// Get all templates
exports.getTemplates = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { page = 1, limit = 10, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

    const offset = (page - 1) * limit;
    const where = { tenant_id };

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { invoice_title: { [Op.like]: `%${search}%` } }
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
    res.status(500).json({ success: false, message: 'Failed to fetch templates', error: error.message });
  }
};

// Get single template
exports.getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.user;

    const template = await Template.findOne({
      where: { id, tenant_id }
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.status(200).json({ success: true, data: template });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch template', error: error.message });
  }
};

// Create template with logo upload
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
      layout,
      sections,
      items,
      companyDetails,
      billToDetails,
      invoiceDetails,
      notes,
      upiDetails
    } = req.body;

    console.log('Creating template for tenant:', tenant_id);
    console.log('Template model available:', !!Template);

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

    // Parse JSON strings if they are strings
    const parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors;
    const parsedFonts = typeof fonts === 'string' ? JSON.parse(fonts) : fonts;
    const parsedSections = typeof sections === 'string' ? JSON.parse(sections) : sections;
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    const parsedCompanyDetails = typeof companyDetails === 'string' ? JSON.parse(companyDetails) : companyDetails;
    const parsedBillToDetails = typeof billToDetails === 'string' ? JSON.parse(billToDetails) : billToDetails;
    const parsedInvoiceDetails = typeof invoiceDetails === 'string' ? JSON.parse(invoiceDetails) : invoiceDetails;
    const parsedUpiDetails = typeof upiDetails === 'string' ? JSON.parse(upiDetails) : upiDetails;

    const templateData = {
      tenant_id,
      created_by: user_id,
      name,
      company_name: companyName || '',
      company_logo_url: logoUrl,
      company_logo_path: logoPath,
      invoice_title: invoiceTitle || 'INVOICE',
      colors: parsedColors || {
        primary: '#1F2937',
        accent: '#3B82F6',
        border: '#E5E7EB',
        text: '#111827',
        lightBg: '#F9FAFB'
      },
      fonts: parsedFonts || {
        heading: 'Plus Jakarta Sans',
        body: 'Inter'
      },
      layout: layout || 'modern',
      sections: parsedSections || {
        showLogo: true,
        showCompanyDetails: true,
        showInvoiceNo: true,
        showDates: true,
        showBillTo: true,
        showItems: true,
        showNotes: true,
        showUpiQr: false
      },
      items: parsedItems || [],
      company_details: parsedCompanyDetails || {},
      bill_to_details: parsedBillToDetails || {},
      invoice_details: parsedInvoiceDetails || {},
      notes: notes || '',
      upi_details: parsedUpiDetails || {}
    };

    console.log('Creating template with data:', templateData);

    // Check if Template is available before creating
    if (!Template || typeof Template.create !== 'function') {
      console.error('❌ Template model is not available or create method is missing');
      return res.status(500).json({
        success: false,
        message: 'Template model not initialized'
      });
    }

    const template = await Template.create(templateData);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create template', 
      error: error.message 
    });
  }
};

// Update template with logo upload
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
      layout,
      sections,
      items,
      companyDetails,
      billToDetails,
      invoiceDetails,
      notes,
      upiDetails
    } = req.body;

    console.log('Updating template:', id);

    const template = await Template.findOne({
      where: { id, tenant_id }
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Handle logo upload if file is present
    let logoUrl = companyLogoUrl !== undefined ? companyLogoUrl : template.company_logo_url;
    let logoPath = companyLogoPath !== undefined ? companyLogoPath : template.company_logo_path;

    if (req.file) {
      // Delete old logo if exists
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

    // Parse JSON strings if they are strings
    const parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors;
    const parsedFonts = typeof fonts === 'string' ? JSON.parse(fonts) : fonts;
    const parsedSections = typeof sections === 'string' ? JSON.parse(sections) : sections;
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    const parsedCompanyDetails = typeof companyDetails === 'string' ? JSON.parse(companyDetails) : companyDetails;
    const parsedBillToDetails = typeof billToDetails === 'string' ? JSON.parse(billToDetails) : billToDetails;
    const parsedInvoiceDetails = typeof invoiceDetails === 'string' ? JSON.parse(invoiceDetails) : invoiceDetails;
    const parsedUpiDetails = typeof upiDetails === 'string' ? JSON.parse(upiDetails) : upiDetails;

    await template.update({
      name: name || template.name,
      company_name: companyName !== undefined ? companyName : template.company_name,
      company_logo_url: logoUrl,
      company_logo_path: logoPath,
      invoice_title: invoiceTitle || template.invoice_title,
      colors: parsedColors || template.colors,
      fonts: parsedFonts || template.fonts,
      layout: layout || template.layout,
      sections: parsedSections || template.sections,
      items: parsedItems || template.items,
      company_details: parsedCompanyDetails || template.company_details,
      bill_to_details: parsedBillToDetails || template.bill_to_details,
      invoice_details: parsedInvoiceDetails || template.invoice_details,
      notes: notes !== undefined ? notes : template.notes,
      upi_details: parsedUpiDetails || template.upi_details
    });

    const updatedTemplate = await Template.findByPk(id);

    res.status(200).json({
      success: true,
      message: 'Template updated successfully',
      data: updatedTemplate
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update template', 
      error: error.message 
    });
  }
};

// Delete template
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.user;

    const template = await Template.findOne({
      where: { id, tenant_id }
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
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