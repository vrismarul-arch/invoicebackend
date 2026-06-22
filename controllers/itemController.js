// controllers/itemController.js
const Item = require('../models/Item');  // ✅ FIXED - direct import, no destructuring
const { Op } = require('sequelize');

const itemController = {
  // ============ CREATE ============
  create: async (req, res) => {
    try {
      const tenant_id = req.user?.tenant_id || req.body?.tenant_id;
      const user_id = req.user?.user_id || req.user?.id || req.body?.created_by;

      const itemData = {
        ...req.body,
        tenant_id,
        created_by: user_id,
        updated_by: user_id
      };

      if (!itemData.name) {
        return res.status(400).json({
          success: false,
          message: 'Item name is required'
        });
      }

      // Handle camelCase to snake_case mapping
      if (itemData.sellingPrice !== undefined) itemData.selling_price = itemData.sellingPrice;
      if (itemData.costPrice !== undefined) itemData.cost_price = itemData.costPrice;
      if (itemData.taxRate !== undefined) itemData.tax_rate = itemData.taxRate;
      if (itemData.hsnCode) itemData.hsn_code = itemData.hsnCode;
      if (itemData.sacCode) itemData.sac_code = itemData.sacCode;
      if (itemData.serviceCode) itemData.service_code = itemData.serviceCode;
      if (itemData.reorderLevel !== undefined) itemData.reorder_level = itemData.reorderLevel;
      if (itemData.rackNumber) itemData.rack_number = itemData.rackNumber;
      if (itemData.totalRacks !== undefined) itemData.total_racks = itemData.totalRacks;
      if (itemData.productsPerRack !== undefined) itemData.products_per_rack = itemData.productsPerRack;
      if (itemData.rackArrangement) itemData.rack_arrangement = itemData.rackArrangement;
      if (itemData.rackLocation) itemData.rack_location = itemData.rackLocation;
      if (itemData.totalCapacity !== undefined) itemData.total_capacity = itemData.totalCapacity;
      if (itemData.deliveryTime) itemData.delivery_time = itemData.deliveryTime;
      if (itemData.requiresApproval !== undefined) itemData.requires_approval = itemData.requiresApproval;

      const item = await Item.create(itemData);

      return res.status(201).json({
        success: true,
        message: `${itemData.type === 'goods' ? 'Product' : 'Service'} created successfully`,
        data: item
      });
    } catch (error) {
      console.error('Error creating item:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create item'
      });
    }
  },

  // ============ GET ALL ============
  getAll: async (req, res) => {
    try {
      const tenant_id = req.user?.tenant_id || req.query?.tenant_id;
      const { 
        page = 1, 
        limit = 20, 
        search, 
        type, 
        category, 
        status, 
        favorite,
        sort_by = 'created_at',
        sort_order = 'DESC'
      } = req.query;

      const whereClause = {};
      if (tenant_id) whereClause.tenant_id = tenant_id;

      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { sku: { [Op.iLike]: `%${search}%` } },
          { service_code: { [Op.iLike]: `%${search}%` } },
          { barcode: { [Op.iLike]: `%${search}%` } },
          { hsn_code: { [Op.iLike]: `%${search}%` } },
          { sac_code: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { brand: { [Op.iLike]: `%${search}%` } },
          { rack_number: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (type && ['goods', 'service'].includes(type)) whereClause.type = type;
      if (category) whereClause.category = category;
      if (status && ['active', 'inactive', 'discontinued'].includes(status)) whereClause.status = status;
      if (favorite === 'true') whereClause.favorite = true;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const order = [[sort_by || 'created_at', sort_order?.toUpperCase() || 'DESC']];

      const { count, rows } = await Item.findAndCountAll({
        where: whereClause,
        order,
        limit: parseInt(limit),
        offset
      });

      return res.status(200).json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil(count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching items:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch items'
      });
    }
  },

  // ============ GET BY ID ============
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const item = await Item.findByPk(id);

      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }

      return res.status(200).json({ success: true, data: item });
    } catch (error) {
      console.error('Error fetching item:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ============ UPDATE ============
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const user_id = req.user?.user_id || req.user?.id;

      const item = await Item.findByPk(id);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }

      const updateData = { ...req.body, updated_by: user_id };

      // Handle camelCase to snake_case mapping
      if (updateData.sellingPrice !== undefined) updateData.selling_price = updateData.sellingPrice;
      if (updateData.costPrice !== undefined) updateData.cost_price = updateData.costPrice;
      if (updateData.taxRate !== undefined) updateData.tax_rate = updateData.taxRate;
      if (updateData.hsnCode) updateData.hsn_code = updateData.hsnCode;
      if (updateData.sacCode) updateData.sac_code = updateData.sacCode;
      if (updateData.serviceCode) updateData.service_code = updateData.serviceCode;
      if (updateData.reorderLevel !== undefined) updateData.reorder_level = updateData.reorderLevel;
      if (updateData.rackNumber) updateData.rack_number = updateData.rackNumber;
      if (updateData.totalRacks !== undefined) updateData.total_racks = updateData.totalRacks;
      if (updateData.productsPerRack !== undefined) updateData.products_per_rack = updateData.productsPerRack;
      if (updateData.rackArrangement) updateData.rack_arrangement = updateData.rackArrangement;
      if (updateData.rackLocation) updateData.rack_location = updateData.rackLocation;
      if (updateData.totalCapacity !== undefined) updateData.total_capacity = updateData.totalCapacity;
      if (updateData.deliveryTime) updateData.delivery_time = updateData.deliveryTime;
      if (updateData.requiresApproval !== undefined) updateData.requires_approval = updateData.requiresApproval;

      await item.update(updateData);

      return res.status(200).json({
        success: true,
        message: 'Item updated successfully',
        data: item
      });
    } catch (error) {
      console.error('Error updating item:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ============ DELETE ============
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const item = await Item.findByPk(id);

      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }

      await item.destroy();
      return res.status(200).json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
      console.error('Error deleting item:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ============ UPDATE STOCK ============
  updateStock: async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity, operation = 'set' } = req.body;
      const item = await Item.findByPk(id);

      if (!item) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      let newStock = item.stock || 0;
      switch (operation) {
        case 'add': newStock += parseInt(quantity); break;
        case 'subtract': newStock = Math.max(0, newStock - parseInt(quantity)); break;
        default: newStock = parseInt(quantity);
      }

      await item.update({ stock: newStock });
      return res.status(200).json({
        success: true,
        message: 'Stock updated',
        data: { id: item.id, stock: newStock }
      });
    } catch (error) {
      console.error('Error updating stock:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ============ BULK UPDATE ============
  bulkUpdate: async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Items array is required' });
      }

      const results = [];
      for (const itemData of items) {
        const item = await Item.findByPk(itemData.id);
        if (item) {
          await item.update(itemData);
          results.push({ id: item.id, status: 'updated' });
        }
      }

      return res.status(200).json({
        success: true,
        message: `Updated ${results.length} items`,
        data: { updated: results }
      });
    } catch (error) {
      console.error('Error bulk updating:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ============ GET CATEGORIES ============
  getCategories: async (req, res) => {
    try {
      const whereClause = { category: { [Op.ne]: null } };
      if (req.query?.type) whereClause.type = req.query.type;

      const categories = await Item.findAll({
        where: whereClause,
        attributes: ['category'],
        group: ['category']
      });

      return res.status(200).json({
        success: true,
        data: categories.map(c => c.category).filter(Boolean).sort()
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ============ GET STATS ============
  getStats: async (req, res) => {
    try {
      const tenant_id = req.user?.tenant_id;
      const where = tenant_id ? { tenant_id } : {};

      const [total, active, products, services, favorites] = await Promise.all([
        Item.count({ where }),
        Item.count({ where: { ...where, status: 'active' } }),
        Item.count({ where: { ...where, type: 'goods' } }),
        Item.count({ where: { ...where, type: 'service' } }),
        Item.count({ where: { ...where, favorite: true } })
      ]);

      return res.status(200).json({
        success: true,
        data: { total, active, products, services, favorites }
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = itemController;