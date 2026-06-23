// models/Customer.js - Complete Model with Proper ENUM Support
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'tenants', key: 'id' }
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  // ✅ Customer Type - Supports Customer, Vendor, Referral
  customer_type: {
    type: DataTypes.ENUM('customer', 'vendor', 'referral'),
    defaultValue: 'customer',
    allowNull: false
  },
  salutation: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  display_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Display name is required'
      }
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: {
        msg: 'Please enter a valid email address'
      }
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  phone_type: {
    type: DataTypes.ENUM('mobile', 'work', 'home'),
    defaultValue: 'mobile'
  },
  alternate_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'INR'
  },
  payment_terms: {
    type: DataTypes.ENUM('upon_receipt', 'net_15', 'net_30', 'net_60', 'due_end_next_month'),
    defaultValue: 'net_30'
  },
  credit_limit: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  opening_balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  enable_portal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  portal_language: {
    type: DataTypes.STRING(5),
    defaultValue: 'en'
  },
  website: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  // Vendor specific fields
  gst_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  pan_number: {
    type: DataTypes.STRING(15),
    allowNull: true
  },
  tax_registration_number: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  // Referral specific fields
  referral_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  commission_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  commission_type: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    defaultValue: 'percentage'
  },
  // Address fields as JSON
  billing_address: {
    type: DataTypes.JSON,
    defaultValue: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    }
  },
  shipping_address: {
    type: DataTypes.JSON,
    defaultValue: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    }
  },
  // Contact persons array
  contact_persons: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  // Social links
  social_links: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  internal_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active'
  },
  favorite: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  last_contact_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  next_follow_up_date: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'customers',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['tenant_id', 'customer_type']
    },
    {
      fields: ['tenant_id', 'email']
    },
    {
      fields: ['tenant_id', 'phone']
    },
    {
      fields: ['tenant_id', 'company_name']
    },
    {
      fields: ['tenant_id', 'status']
    }
  ]
});

// Instance method to get full name
Customer.prototype.getFullName = function() {
  if (this.display_name) return this.display_name;
  const name = [this.first_name, this.last_name].filter(Boolean).join(' ');
  return name || 'Unnamed';
};

// Instance method to get type label
Customer.prototype.getTypeLabel = function() {
  const types = {
    customer: 'Customer',
    vendor: 'Vendor',
    referral: 'Referral'
  };
  return types[this.customer_type] || this.customer_type;
};

// Virtual field for display type
Customer.prototype.getDisplayType = function() {
  return this.customer_type || 'customer';
};

module.exports = Customer;