// models/Item.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Item = sequelize.define('Item', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'tenants',
      key: 'id'
    }
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Type & Basic Info
  type: {
    type: DataTypes.ENUM('goods', 'service'),
    allowNull: false,
    defaultValue: 'goods'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  brand: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Goods/Product Specific Fields
  sku: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true
  },
  barcode: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  unit: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  uqc: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  weight: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  dimensions: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Service Specific Fields
  service_code: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true
  },
  sac_code: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  duration: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  delivery_time: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  requires_approval: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Pricing
  selling_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  cost_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  mrp: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  
  // Tax
  tax_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 18.00
  },
  hsn_code: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  
  // Inventory
  stock: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  reorder_level: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  
  // Rack Management
  rack_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  total_racks: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1
  },
  products_per_rack: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  rack_arrangement: {
    type: DataTypes.ENUM('shelf', 'pallet', 'bin', 'drawer', 'stack', 'custom'),
    allowNull: true,
    defaultValue: 'shelf'
  },
  rack_location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  total_capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  
  // Status & Flags
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'discontinued'),
    allowNull: false,
    defaultValue: 'active'
  },
  favorite: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'items',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['type'] },
    { fields: ['category'] },
    { fields: ['sku'] },
    { fields: ['service_code'] },
    { fields: ['status'] },
    { fields: ['favorite'] },
    { fields: ['rack_number'] }
  ],
  hooks: {
    beforeSave: async (item) => {
      // Auto-calculate total capacity
      if (item.total_racks && item.products_per_rack) {
        item.total_capacity = item.total_racks * item.products_per_rack;
      }
    }
  }
});

module.exports = Item;