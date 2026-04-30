const { validationResult } = require('express-validator');
const Invoice = require('../models/Invoice');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const sequelize = require('../config/database');

// @desc    Create invoice
// @route   POST /api/invoices
// @access  Private
const createInvoice = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { 
      client_name, 
      client_email, 
      client_company,
      client_address,
      client_gst,
      amount,
      tax_amount,
      items,
      due_date,
      notes
    } = req.body;
    
    // Calculate total amount
    const total_amount = parseFloat(amount) + parseFloat(tax_amount || 0);
    
    const invoice = await Invoice.create({
      client_name,
      client_email,
      client_company,
      client_address,
      client_gst,
      amount,
      tax_amount: tax_amount || 0,
      total_amount,
      items: items || [],
      due_date,
      notes,
      tenant_id: req.user.tenant_id,
      created_by: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Get all invoices for tenant
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      search,
      from_date,
      to_date,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    let where = { tenant_id: req.user.tenant_id };
    
    // Filter by status
    if (status && status !== 'all') {
      where.status = status;
    }
    
    // Search by client name or invoice number
    if (search) {
      where[Op.or] = [
        { client_name: { [Op.like]: `%${search}%` } },
        { invoice_number: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Date range filter
    if (from_date) {
      where.created_at = { [Op.gte]: new Date(from_date) };
    }
    if (to_date) {
      where.created_at = { ...where.created_at, [Op.lte]: new Date(to_date) };
    }
    
    const invoices = await Invoice.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort_by, sort_order]],
      attributes: { exclude: ['items'] } // Exclude heavy items data for list
    });
    
    res.json({
      success: true,
      count: invoices.count,
      totalPages: Math.ceil(invoices.count / limit),
      currentPage: parseInt(page),
      data: invoices.rows
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: {
        id: req.params.id,
        tenant_id: req.user.tenant_id
      },
      include: [
        { 
          model: User, 
          as: 'creator', 
          attributes: ['id', 'name', 'email'] 
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'organization_name', 'gst_number', 'logo_url']
        }
      ]
    });
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }
    
    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: {
        id: req.params.id,
        tenant_id: req.user.tenant_id
      }
    });
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }
    
    // Don't allow editing paid invoices
    if (invoice.status === 'paid') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot edit paid invoice' 
      });
    }
    
    const { amount, tax_amount, ...updateData } = req.body;
    
    // Recalculate total if amount or tax changes
    if (amount !== undefined || tax_amount !== undefined) {
      const newAmount = amount !== undefined ? amount : invoice.amount;
      const newTax = tax_amount !== undefined ? tax_amount : invoice.tax_amount;
      updateData.total_amount = parseFloat(newAmount) + parseFloat(newTax);
      if (amount !== undefined) updateData.amount = amount;
      if (tax_amount !== undefined) updateData.tax_amount = tax_amount;
    }
    
    await invoice.update(updateData);
    
    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: {
        id: req.params.id,
        tenant_id: req.user.tenant_id
      }
    });
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }
    
    // Don't allow deleting paid invoices
    if (invoice.status === 'paid') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete paid invoice' 
      });
    }
    
    await invoice.destroy();
    
    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Send invoice email
// @route   POST /api/invoices/:id/send
// @access  Private
const sendInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: {
        id: req.params.id,
        tenant_id: req.user.tenant_id
      },
      include: [
        { model: Tenant, as: 'tenant' },
        { model: User, as: 'creator' }
      ]
    });
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }
    
    // Here you would integrate email sending service
    // For now, just mark as sent
    if (invoice.status === 'draft') {
      await invoice.update({ status: 'sent' });
    }
    
    res.json({
      success: true,
      message: 'Invoice sent successfully',
      data: invoice
    });
  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Mark invoice as paid
// @route   PUT /api/invoices/:id/paid
// @access  Private
const markAsPaid = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: {
        id: req.params.id,
        tenant_id: req.user.tenant_id
      }
    });
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }
    
    await invoice.update({
      status: 'paid',
      paid_at: new Date()
    });
    
    res.json({
      success: true,
      message: 'Invoice marked as paid',
      data: invoice
    });
  } catch (error) {
    console.error('Mark as paid error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Get invoice statistics
// @route   GET /api/invoices/stats/summary
// @access  Private
const getInvoiceStats = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    if (period === 'week') {
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      dateFilter = { created_at: { [Op.gte]: weekAgo } };
    } else if (period === 'month') {
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
      dateFilter = { created_at: { [Op.gte]: monthAgo } };
    } else if (period === 'year') {
      const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
      dateFilter = { created_at: { [Op.gte]: yearAgo } };
    }
    
    const stats = await Invoice.findAll({
      where: {
        tenant_id: req.user.tenant_id,
        ...dateFilter
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total']
      ],
      group: ['status']
    });
    
    let totalRevenue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    
    stats.forEach(stat => {
      const total = parseFloat(stat.dataValues.total || 0);
      const count = parseInt(stat.dataValues.count);
      
      totalRevenue += total;
      
      if (stat.status === 'paid') {
        paidCount = count;
      } else if (stat.status === 'overdue') {
        overdueCount = count;
      } else if (stat.status !== 'cancelled') {
        pendingCount += count;
      }
    });
    
    res.json({
      success: true,
      data: {
        total_revenue: totalRevenue,
        paid_invoices: paidCount,
        pending_invoices: pendingCount,
        overdue_invoices: overdueCount,
        breakdown: stats
      }
    });
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

module.exports = { 
  createInvoice, 
  getInvoices, 
  getInvoice, 
  updateInvoice, 
  deleteInvoice,
  sendInvoice,
  markAsPaid,
  getInvoiceStats
};