// models/Template.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Template = sequelize.define('Template', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  company_logo_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  company_logo_path: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  invoice_title: {
    type: DataTypes.STRING(100),
    defaultValue: 'INVOICE'
  },
  colors: {
    type: DataTypes.JSON,
    defaultValue: {
      primary: '#1F2937',
      accent: '#3B82F6',
      border: '#E5E7EB',
      text: '#111827',
      lightBg: '#F9FAFB'
    }
  },
  fonts: {
    type: DataTypes.JSON,
    defaultValue: {
      heading: 'Plus Jakarta Sans',
      body: 'Inter'
    }
  },
  layout: {
    type: DataTypes.STRING(50),
    defaultValue: 'modern'
  },
  sections: {
    type: DataTypes.JSON,
    defaultValue: {
      showLogo: true,
      showCompanyDetails: true,
      showInvoiceNo: true,
      showDates: true,
      showBillTo: true,
      showItems: true,
      showNotes: true,
      showUpiQr: false
    }
  },
  items: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  company_details: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  bill_to_details: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  invoice_details: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  upi_details: {
    type: DataTypes.JSON,
    defaultValue: {}
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
  }
}, {
  tableName: 'templates',
  timestamps: true,
  underscored: true
});

module.exports = Template;