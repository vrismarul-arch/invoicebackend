const Customer = require('../models/Customer');
const { Op } = require('sequelize');

// Helper to map camelCase to snake_case and handle empty strings
const mapFields = (data) => {
  const mapping = {
    firstName: 'first_name',
    lastName: 'last_name',
    companyName: 'company_name',
    displayName: 'display_name',
    phoneType: 'phone_type',
    alternatePhone: 'alternate_phone',
    gstNumber: 'gst_number',
    panNumber: 'pan_number',
    taxRegistrationNumber: 'tax_registration_number',
    paymentTerms: 'payment_terms',
    creditLimit: 'credit_limit',
    openingBalance: 'opening_balance',
    referralCode: 'referral_code',
    commissionRate: 'commission_rate',
    commissionType: 'commission_type',
    enablePortal: 'enable_portal',
    portalLanguage: 'portal_language',
    billingAddress: 'billing_address',
    shippingAddress: 'shipping_address',
    contactPersons: 'contact_persons',
    socialLinks: 'social_links',
    internalNotes: 'internal_notes',
    customerType: 'customer_type',
    // ✅ CRITICAL: Map contact_type to customer_type
    contactType: 'customer_type'
  };

  const mapped = { ...data };
  Object.entries(mapping).forEach(([camel, snake]) => {
    if (mapped[camel] !== undefined) {
      // Convert empty strings to null for fields that can be null
      const nullableFields = ['referral_code', 'gst_number', 'pan_number', 'tax_registration_number', 'alternate_phone', 'website'];
      if (nullableFields.includes(snake) && mapped[camel] === '') {
        mapped[snake] = null;
      } else {
        mapped[snake] = mapped[camel];
      }
      delete mapped[camel];
    }
  });
  
  return mapped;
};

const customerController = {
  // ============ CREATE ============
  create: async (req, res) => {
    try {
      const tenant_id = req.user?.tenant_id || req.body.tenant_id;
      const user_id = req.user?.user_id || req.user?.id;

      let data = { ...req.body, tenant_id, created_by: user_id };
      data = mapFields(data);

      // Ensure customer_type is set (default to 'customer' if not provided)
      if (!data.customer_type) {
        data.customer_type = 'customer';
      }

      if (!data.display_name) {
        return res.status(400).json({ success: false, message: 'Display name is required' });
      }

      console.log('📝 Creating customer:', data);
      const customer = await Customer.create(data);
      res.status(201).json({ success: true, data: customer });
    } catch (error) {
      console.error('❌ Create customer error:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ 
          success: false, 
          message: 'Duplicate entry found',
          errors: error.errors?.map(e => e.message)
        });
      }
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation error',
          errors: error.errors?.map(e => e.message)
        });
      }
      
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ============ GET ALL ============
  getAll: async (req, res) => {
    try {
      const tenant_id = req.user?.tenant_id;
      const { page = 1, limit = 20, search, status, favorite, customer_type, contact_type } = req.query;
      
      const where = { tenant_id };
      
      // Filter by customer type - support both customer_type and contact_type
      const type = customer_type || contact_type;
      console.log('🔍 Filtering by type:', type);
      console.log('📋 Query params:', req.query);
      
      if (type && ['customer', 'vendor', 'referral'].includes(type)) {
        where.customer_type = type;
      }
      
      if (search) {
        where[Op.or] = [
          { display_name: { [Op.like]: `%${search}%` } },
          { first_name: { [Op.like]: `%${search}%` } },
          { last_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { company_name: { [Op.like]: `%${search}%` } },
          { gst_number: { [Op.like]: `%${search}%` } },
          { referral_code: { [Op.like]: `%${search}%` } }
        ];
      }
      if (status) where.status = status;
      if (favorite === 'true') where.favorite = true;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const { count, rows } = await Customer.findAndCountAll({
        where, 
        order: [['created_at', 'DESC']], 
        limit: parseInt(limit), 
        offset
      });

      console.log(`📊 Found ${count} ${type || 'all'} contacts`);

      res.json({
        success: true,
        data: rows,
        pagination: { 
          total: count, 
          page: parseInt(page), 
          limit: parseInt(limit), 
          total_pages: Math.ceil(count / limit) 
        }
      });
    } catch (error) {
      console.error('❌ Get all customers error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ============ GET BY ID ============
  getById: async (req, res) => {
    try {
      const customer = await Customer.findByPk(req.params.id);
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }
      res.json({ success: true, data: customer });
    } catch (error) {
      console.error('❌ Get customer error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ============ UPDATE ============
  update: async (req, res) => {
    try {
      const customer = await Customer.findByPk(req.params.id);
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      let data = mapFields({ ...req.body });
      
      // Preserve customer_type if not provided in update
      if (!data.customer_type && customer.customer_type) {
        data.customer_type = customer.customer_type;
      }
      
      console.log('📝 Updating customer:', data);
      await customer.update(data);
      res.json({ success: true, data: customer });
    } catch (error) {
      console.error('❌ Update customer error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ============ DELETE ============
  delete: async (req, res) => {
    try {
      const customer = await Customer.findByPk(req.params.id);
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }
      
      console.log('🗑️ Deleting customer:', customer.id);
      await customer.destroy();
      res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (error) {
      console.error('❌ Delete customer error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ============ GET STATS ============
  getStats: async (req, res) => {
    try {
      const tenant_id = req.user?.tenant_id;
      const where = { tenant_id };
      const { customer_type, contact_type } = req.query;
      
      // Support both customer_type and contact_type
      const type = customer_type || contact_type;
      if (type && ['customer', 'vendor', 'referral'].includes(type)) {
        where.customer_type = type;
      }

      const [total, active, inactive, favorites] = await Promise.all([
        Customer.count({ where }),
        Customer.count({ where: { ...where, status: 'active' } }),
        Customer.count({ where: { ...where, status: 'inactive' } }),
        Customer.count({ where: { ...where, favorite: true } })
      ]);
      
      res.json({ 
        success: true, 
        data: { total, active, inactive, favorites } 
      });
    } catch (error) {
      console.error('❌ Get stats error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = customerController;