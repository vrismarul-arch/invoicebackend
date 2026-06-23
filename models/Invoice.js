// models/Invoice.js

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Template = require('./Template');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  invoice_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },

  client_name: DataTypes.STRING(255),
  client_email: DataTypes.STRING(255),
  client_company: DataTypes.STRING(255),

  client_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  client_gst: {
    type: DataTypes.STRING(50),
    defaultValue: ''
  },

  client_phone: DataTypes.STRING(30),

  items: {
    type: DataTypes.JSON,
    defaultValue: []
  },

  amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },

  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },

  tax_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 18
  },

  tax_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },

  discount: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },

  discount_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },

  taxable_value: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },

  shipping_charge: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },

  total_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },

  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'INR'
  },

  place_of_supply: {
    type: DataTypes.STRING(100),
    defaultValue: ''
  },

  shipping_address: DataTypes.TEXT,

  terms: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },

  notes: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },

  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'draft'
  },

  due_date: DataTypes.DATE,
  issue_date: DataTypes.DATE,
  paid_at: DataTypes.DATE,

  upi_id: DataTypes.STRING(100),

  upi_payee_name: {
    type: DataTypes.STRING(255),
    defaultValue: ''
  },

  upi_description: {
    type: DataTypes.STRING(255),
    defaultValue: 'Invoice payment'
  },

  upi_qr_url: DataTypes.STRING(500),
  upi_transaction_id: DataTypes.STRING(100),
  upi_payment_status: DataTypes.STRING(20),
  upi_payment_date: DataTypes.DATE,

  template_id: DataTypes.UUID,

  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false
  },

  created_by: DataTypes.UUID

}, {
  tableName: 'invoices',

  timestamps: true,

  createdAt: 'created_at',
  updatedAt: 'updated_at',

  underscored: true
});

Invoice.belongsTo(Template, {
  foreignKey: 'template_id',
  as: 'template'
});

Template.hasMany(Invoice, {
  foreignKey: 'template_id',
  as: 'invoices'
});

module.exports = Invoice;