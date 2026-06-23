// controllers/invoiceController.js - Fixed: company details now come from Template join
// Items handling supports BOTH cases:
//   A) items stored as JSON column directly on Invoice (default assumption here)
//   B) items stored in a separate InvoiceItem table (see commented include below)

const { Op } = require('sequelize');
const Invoice = require('../models/Invoice');
const Template = require('../models/Template');
// const InvoiceItem = require('../models/InvoiceItem'); // uncomment if items is a separate table

// ============ HELPER: merge company info from Template into the invoice payload ============
const attachTemplateData = (invoiceJson) => {
  const template = invoiceJson.template || {};

  return {
    ...invoiceJson,

    // ⭐ THIS is the main fix — company details were never on the invoice row,
    // they live on the Template. Pull them in here so the frontend always
    // gets company_name / company_details regardless of which screen renders it.
    company_name: template.company_name || '',
    company_logo_url: template.company_logo_url || '',
    company_details: template.company_details || {},

    // Styling so InvoicePreview.jsx renders with the right look immediately
    colors: template.colors || null,
    typography: template.typography || null,
    sections: template.sections || null,
    layout: template.layout || 'modern',
    invoice_title: template.invoice_title || 'INVOICE',

    // keep the raw template object too, in case the frontend wants it directly
    template: undefined // remove nested duplicate to keep payload clean
  };
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res) => {
  try {
    const { tenant_id } = req.user;

    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { tenant_id };

    if (status) {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { invoice_number: { [Op.like]: `%${search}%` } },
        { client_name: { [Op.like]: `%${search}%` } },
        { client_company: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Invoice.findAndCountAll({
      where,

      include: [
        {
          model: Template,
          as: 'template'
        }
      ],

      order: [['created_at', 'DESC']],

      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const data = rows.map(invoice =>
      attachTemplateData(invoice.toJSON())
    );

    res.status(200).json({
      success: true,
      count: data.length,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      limit: parseInt(limit),
      data
    });

  } catch (error) {
    console.error('Get invoices error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
      error: error.message
    });
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.user;

    const invoice = await Invoice.findOne({
      where: { id, tenant_id },
      include: [
        { model: Template, as: 'template' }
        // { model: InvoiceItem, as: 'items' } // uncomment if items is a separate table
      ]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const data = attachTemplateData(invoice.toJSON());

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice',
      error: error.message
    });
  }
};

// @desc    Create invoice
// @route   POST /api/invoices
// @access  Private
exports.createInvoice = async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user;
    const {
      invoice_number,
      template_id,
      client_name,
      client_email,
      client_company,
      client_address,
      client_gst,
      client_phone,
      items, // expect an array here from the frontend
      amount,
      subtotal,
      tax_rate,
      tax_amount,
      discount,
      discount_amount,
      taxable_value,
      shipping_charge,
      total_amount,
      currency,
      place_of_supply,
      shipping_address,
      terms,
      notes,
      status,
      due_date,
      issue_date,
      upi_id,
      upi_payee_name,
      upi_description
    } = req.body;

    if (!invoice_number) {
      return res.status(400).json({ success: false, message: 'Invoice number is required' });
    }

    const invoiceData = {
      tenant_id,
      created_by: user_id,
      invoice_number,
      template_id: template_id || null,
      client_name: client_name || '',
      client_email: client_email || '',
      client_company: client_company || '',
      client_address: typeof client_address === 'object' ? JSON.stringify(client_address) : (client_address || ''),
      client_gst: client_gst || '',
      client_phone: client_phone || '',
      items: Array.isArray(items) ? items : [], // ⭐ make sure items actually get saved
      amount: amount || 0,
      subtotal: subtotal || 0,
      tax_rate: tax_rate ?? 18,
      tax_amount: tax_amount || 0,
      discount: discount || 0,
      discount_amount: discount_amount || 0,
      taxable_value: taxable_value || 0,
      shipping_charge: shipping_charge || 0,
      total_amount: total_amount || 0,
      currency: currency || 'INR',
      place_of_supply: place_of_supply || '',
      shipping_address: typeof shipping_address === 'object' ? JSON.stringify(shipping_address) : (shipping_address || ''),
      terms: terms || '',
      notes: notes || '',
      status: status || 'draft',
      due_date: due_date || null,
      issue_date: issue_date || new Date(),
      upi_id: upi_id || null,
      upi_payee_name: upi_payee_name || '',
      upi_description: upi_description || 'Invoice payment'
    };

    const invoice = await Invoice.create(invoiceData);

    // re-fetch with template included so the response matches getInvoiceById shape
    const fullInvoice = await Invoice.findOne({
      where: { id: invoice.id },
      include: [{ model: Template, as: 'template' }]
    });

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: attachTemplateData(fullInvoice.toJSON())
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create invoice',
      error: error.message
    });
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
exports.updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.user;

    const invoice = await Invoice.findOne({ where: { id, tenant_id } });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const body = { ...req.body };

    // normalize JSON-ish fields if sent as objects
    if (body.client_address && typeof body.client_address === 'object') {
      body.client_address = JSON.stringify(body.client_address);
    }
    if (body.shipping_address && typeof body.shipping_address === 'object') {
      body.shipping_address = JSON.stringify(body.shipping_address);
    }
    if (body.items && !Array.isArray(body.items)) {
      try { body.items = JSON.parse(body.items); } catch (e) { /* leave as-is */ }
    }

    await invoice.update(body);

    const updatedInvoice = await Invoice.findOne({
      where: { id },
      include: [{ model: Template, as: 'template' }]
    });

    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: attachTemplateData(updatedInvoice.toJSON())
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update invoice',
      error: error.message
    });
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
exports.deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id } = req.user;

    const invoice = await Invoice.findOne({ where: { id, tenant_id } });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    await invoice.destroy();

    res.status(200).json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete invoice',
      error: error.message
    });
  }
};

module.exports = {
  getInvoices: exports.getInvoices,
  getInvoiceById: exports.getInvoiceById,
  createInvoice: exports.createInvoice,
  updateInvoice: exports.updateInvoice,
  deleteInvoice: exports.deleteInvoice
};