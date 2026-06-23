// controllers/customerController.js - Updated (removed problematic fields)
const Customer = require('../models/Customer');
const { Op } = require('sequelize');

// Map camelCase to snake_case
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
    contactType: 'customer_type'
    // ❌ REMOVED: lastContactDate and nextFollowUpDate
  };

  const mapped = { ...data };
  Object.entries(mapping).forEach(([camel, snake]) => {
    if (mapped[camel] !== undefined) {
      const nullableFields = [
        'referral_code', 'gst_number', 'pan_number', 
        'tax_registration_number', 'alternate_phone', 'website'
      ];
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

const isValidCustomerType = (type) => {
  return ['customer', 'vendor', 'referral'].includes(type);
};

const isValidStatus = (status) => {
  return ['active', 'inactive', 'suspended'].includes(status);
};

const customerController = {
  create: async (req, res) => {
    try {
      const tenant_id = req.user?.tenant_id || req.body.tenant_id;
      const user_id = req.user?.user_id || req.user?.id;

      let data = { ...req.body, tenant_id, created_by: user_id };
      data = mapFields(data);

      if (!data.customer_type) {
        data.customer_type = 'customer';
      }

      if (!isValidCustomerType(data.customer_type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer type. Must be: customer, vendor, or referral'
        });
      }

      if (data.status && !isValidStatus(data.status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be: active, inactive, or suspended'
        });
      }

      if (!data.display_name) {
        return res.status(400).json({
          success: false,
          message: 'Display name is required'
        });
      }

      // Check for duplicate email
      if (data.email) {
        const existing = await Customer.findOne({
          where: {
            tenant_id,
            email: data.email
          }
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'A customer with this email already exists'
          });
        }
      }

      // Check for duplicate referral code
      if (data.referral_code) {
        const existing = await Customer.findOne({
          where: {
            tenant_id,
            referral_code: data.referral_code
          }
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'This referral code is already in use'
          });
        }
      }

      console.log('📝 Creating customer:', { 
        ...data, 
        tenant_id, 
        created_by: user_id,
        customer_type: data.customer_type 
      });

      const customer = await Customer.create(data);
      
      res.status(201).json({
        success: true,
        message: `${customer.getTypeLabel()} created successfully`,
        data: customer
      });
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
      
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create customer'
      });
    }
  },

  getAll: async (req, res) => {
    try {
      const tenant_id = req.user?.tenant_id;
      const {
        page = 1,
        limit = 20,
        search,
        status,
        favorite,
        customer_type,
        contact_type,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;
      
      const where = { tenant_id };
      
      const type = customer_type || contact_type;
      if (type && isValidCustomerType(type)) {
        where.customer_type = type;
      }
      
      if (status && isValidStatus(status)) {
        where.status = status;
      }
      
      if (favorite === 'true') {
        where.favorite = true;
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
          { pan_number: { [Op.like]: `%${search}%` } },
          { referral_code: { [Op.like]: `%${search}%` } }
        ];
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const order = [[sortBy, sortOrder]];

      const { count, rows } = await Customer.findAndCountAll({
        where,
        order,
        limit: parseInt(limit),
        offset
      });

      const stats = {
        total: count,
        active: rows.filter(r => r.status === 'active').length,
        inactive: rows.filter(r => r.status === 'inactive').length,
        suspended: rows.filter(r => r.status === 'suspended').length,
        favorites: rows.filter(r => r.favorite).length
      };

      const typeStats = {
        customer: rows.filter(r => r.customer_type === 'customer').length,
        vendor: rows.filter(r => r.customer_type === 'vendor').length,
        referral: rows.filter(r => r.customer_type === 'referral').length
      };

      console.log(`📊 Found ${count} ${type || 'all'} contacts`);

      res.json({
        success: true,
        data: rows,
        stats,
        typeStats,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('❌ Get all customers error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch customers'
      });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const tenant_id = req.user?.tenant_id;

      const customer = await Customer.findOne({
        where: {
          id,
          tenant_id
        }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      res.json({
        success: true,
        data: customer
      });
    } catch (error) {
      console.error('❌ Get customer error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch customer'
      });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const tenant_id = req.user?.tenant_id;

      const customer = await Customer.findOne({
        where: {
          id,
          tenant_id
        }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      let data = mapFields({ ...req.body });
      
      if (!data.customer_type) {
        data.customer_type = customer.customer_type;
      }

      if (data.customer_type && !isValidCustomerType(data.customer_type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer type. Must be: customer, vendor, or referral'
        });
      }

      if (data.status && !isValidStatus(data.status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be: active, inactive, or suspended'
        });
      }

      if (data.email && data.email !== customer.email) {
        const existing = await Customer.findOne({
          where: {
            tenant_id,
            email: data.email,
            id: { [Op.ne]: id }
          }
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'A customer with this email already exists'
          });
        }
      }

      if (data.referral_code && data.referral_code !== customer.referral_code) {
        const existing = await Customer.findOne({
          where: {
            tenant_id,
            referral_code: data.referral_code,
            id: { [Op.ne]: id }
          }
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'This referral code is already in use'
          });
        }
      }

      console.log('📝 Updating customer:', { id, ...data });

      await customer.update(data);
      
      res.json({
        success: true,
        message: `${customer.getTypeLabel()} updated successfully`,
        data: customer
      });
    } catch (error) {
      console.error('❌ Update customer error:', error);
      
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
      
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update customer'
      });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const tenant_id = req.user?.tenant_id;

      const customer = await Customer.findOne({
        where: {
          id,
          tenant_id
        }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      console.log('🗑️ Deleting customer:', customer.id, customer.getTypeLabel());

      await customer.destroy();
      
      res.json({
        success: true,
        message: `${customer.getTypeLabel()} deleted successfully`
      });
    } catch (error) {
      console.error('❌ Delete customer error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete customer'
      });
    }
  },

  getStats: async (req, res) => {
    try {
      const tenant_id = req.user?.tenant_id;
      const { customer_type, contact_type } = req.query;
      
      const where = { tenant_id };
      
      const type = customer_type || contact_type;
      if (type && isValidCustomerType(type)) {
        where.customer_type = type;
      }

      const [total, active, inactive, suspended, favorites] = await Promise.all([
        Customer.count({ where }),
        Customer.count({ where: { ...where, status: 'active' } }),
        Customer.count({ where: { ...where, status: 'inactive' } }),
        Customer.count({ where: { ...where, status: 'suspended' } }),
        Customer.count({ where: { ...where, favorite: true } })
      ]);

      const typeStats = {
        customer: await Customer.count({ where: { ...where, customer_type: 'customer' } }),
        vendor: await Customer.count({ where: { ...where, customer_type: 'vendor' } }),
        referral: await Customer.count({ where: { ...where, customer_type: 'referral' } })
      };

      const recent = await Customer.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: 5,
        attributes: ['id', 'display_name', 'customer_type', 'email', 'created_at']
      });

      res.json({
        success: true,
        data: {
          total,
          active,
          inactive,
          suspended,
          favorites,
          typeStats,
          recent
        }
      });
    } catch (error) {
      console.error('❌ Get stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch stats'
      });
    }
  },

  toggleFavorite: async (req, res) => {
    try {
      const { id } = req.params;
      const tenant_id = req.user?.tenant_id;

      const customer = await Customer.findOne({
        where: {
          id,
          tenant_id
        }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      await customer.update({ favorite: !customer.favorite });

      res.json({
        success: true,
        message: customer.favorite ? 'Added to favorites' : 'Removed from favorites',
        data: customer
      });
    } catch (error) {
      console.error('❌ Toggle favorite error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to toggle favorite'
      });
    }
  }
};

module.exports = customerController;