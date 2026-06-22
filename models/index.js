// models/index.js - Minimal Version
const sequelize = require('../config/database');
const Invoice = require('./Invoice');
const User = require('./User');
const Tenant = require('./Tenant');
const Template = require('./Template');
const Item = require('./Item');

console.log('📦 Models loaded:', {
  Invoice: !!Invoice,
  User: !!User,
  Tenant: !!Tenant,
  Template: !!Template,
  Item: !!Item
});

// Simple one-to-many from Tenant
Tenant.hasMany(Invoice, { foreignKey: 'tenant_id' });
Tenant.hasMany(Template, { foreignKey: 'tenant_id' });
Tenant.hasMany(User, { foreignKey: 'tenant_id' });
Tenant.hasMany(Item, { foreignKey: 'tenant_id' });

// Belongs to Tenant (without alias to avoid conflicts)
Invoice.belongsTo(Tenant, { foreignKey: 'tenant_id' });
Template.belongsTo(Tenant, { foreignKey: 'tenant_id' });
User.belongsTo(Tenant, { foreignKey: 'tenant_id' });
Item.belongsTo(Tenant, { foreignKey: 'tenant_id' });

// Creator relations
Invoice.belongsTo(User, { foreignKey: 'created_by' });
Template.belongsTo(User, { foreignKey: 'created_by' });
Item.belongsTo(User, { foreignKey: 'created_by' });

console.log('✅ Associations complete');

module.exports = { sequelize, Invoice, User, Tenant, Template, Item };