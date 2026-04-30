const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tenant = sequelize.define('Tenant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  organization_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  industry: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  business_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  street_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  district: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'India'
  },
  postal_code: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  gst_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  logo_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  timezone: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Asia/Kolkata (UTC+05:30)'
  },
  contact_numbers: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  tax_groups: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  business_slug: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  subscription_status: {
    type: DataTypes.ENUM('trial', 'active', 'suspended', 'cancelled'),
    defaultValue: 'trial'
  },
  trial_ends_at: {
    type: DataTypes.DATE,
    defaultValue: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  }
}, {
  tableName: 'tenants',
  timestamps: true,
  underscored: true
});

module.exports = Tenant;