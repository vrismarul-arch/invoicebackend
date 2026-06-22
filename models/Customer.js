// models/Customer.js
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
  customer_type: {
    type: DataTypes.ENUM('individual', 'business'),
    defaultValue: 'individual'
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
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: { isEmail: true }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  phone_type: {
    type: DataTypes.ENUM('mobile', 'work', 'home'),
    defaultValue: 'mobile'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'INR'
  },
  payment_terms: {
    type: DataTypes.STRING(50),
    defaultValue: 'net_30'
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
  billing_address: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  shipping_address: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  contact_persons: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  social_links: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  },
  favorite: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'customers',
  timestamps: true,
  underscored: true
});

module.exports = Customer;