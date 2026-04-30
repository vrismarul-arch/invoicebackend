const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Tenant = require('./Tenant');

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
  client_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  client_email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  client_company: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  client_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  client_gst: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD'
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled'),
    defaultValue: 'draft'
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  issue_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  items: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'invoices',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (invoice) => {
      if (!invoice.invoice_number) {
        const count = await Invoice.count({ where: { tenant_id: invoice.tenant_id } });
        const year = new Date().getFullYear();
        invoice.invoice_number = `INV-${year}-${String(count + 1).padStart(6, '0')}`;
      }
    }
  }
});

Invoice.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Invoice.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Tenant.hasMany(Invoice, { foreignKey: 'tenant_id', as: 'invoices' });

module.exports = Invoice;