// models/index.js
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

// ⭐ Tenant relationships (One-to-Many)
Tenant.hasMany(Invoice, { foreignKey: 'tenant_id' });
Tenant.hasMany(Template, { foreignKey: 'tenant_id' });
Tenant.hasMany(User, { foreignKey: 'tenant_id' });
Tenant.hasMany(Item, { foreignKey: 'tenant_id' });

// ⭐ Belongs to Tenant
Invoice.belongsTo(Tenant, { foreignKey: 'tenant_id' });
Template.belongsTo(Tenant, { foreignKey: 'tenant_id' });
User.belongsTo(Tenant, { foreignKey: 'tenant_id' });
Item.belongsTo(Tenant, { foreignKey: 'tenant_id' });

// ⭐ Creator relations (User who created)
Invoice.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Template.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Item.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// ⭐ User has many created items
User.hasMany(Invoice, { foreignKey: 'created_by', as: 'createdInvoices' });
User.hasMany(Template, { foreignKey: 'created_by', as: 'createdTemplates' });
User.hasMany(Item, { foreignKey: 'created_by', as: 'createdItems' });

// ⭐ Template - Invoice relationship (No foreign key constraint in DB)
// This is just for Sequelize to understand the relationship
Template.hasMany(Invoice, { foreignKey: 'template_id' });
Invoice.belongsTo(Template, { foreignKey: 'template_id' });

console.log('✅ Associations complete');

module.exports = { sequelize, Invoice, User, Tenant, Template, Item };