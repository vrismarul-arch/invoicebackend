// controllers/tenantController.js
const { validationResult } = require('express-validator');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const sequelize = require('../config/database');
const { uploadToSupabase, deleteFromSupabase } = require('../middleware/upload');

// Helper function to parse JSON fields safely
const parseJSONField = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

// Helper function to extract logo URL from upload result
const extractLogoUrl = (uploadResult) => {
  if (!uploadResult) return null;
  if (typeof uploadResult === 'string') return uploadResult;
  if (uploadResult.publicUrl) return uploadResult.publicUrl;
  if (uploadResult.url) return uploadResult.url;
  if (uploadResult.data?.publicUrl) return uploadResult.data.publicUrl;
  return null;
};

// ============ CREATE OR UPDATE TENANT ============
// @desc    Create or update tenant
// @route   POST /api/tenants
// @access  Private
const createOrUpdateTenant = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { 
      organization_name, 
      industry, 
      business_type, 
      street_address, 
      district,
      city,
      state,
      country,
      postal_code,
      gst_number,
      website,
      timezone,
      contact_numbers,
      tax_groups
    } = req.body;
    
    console.log('📝 Create/Update Tenant - Received data:', {
      organization_name,
      industry,
      business_type,
      street_address,
      district,
      city,
      state,
      country,
      postal_code,
      gst_number,
      website,
      timezone
    });
    
    let logo_url = null;
    
    // Handle logo upload
    if (req.file) {
      try {
        const uploadResult = await uploadToSupabase(req.file, 'logos');
        console.log('✅ Logo upload result:', uploadResult);
        logo_url = extractLogoUrl(uploadResult);
        console.log('✅ Logo URL extracted:', logo_url);
      } catch (error) {
        console.error('❌ Logo upload error:', error);
        // Don't fail the request, just log error
      }
    }
    
    // Check if user already has a tenant
    let tenant = await Tenant.findOne({ 
      where: { id: req.user.tenant_id } 
    });
    
    if (!tenant) {
      // Create new tenant
      tenant = await Tenant.create({
        organization_name,
        industry: industry || null,
        business_type: business_type || null,
        street_address: street_address || null,
        district: district || null,
        city: city || null,
        state: state || null,
        country: country || 'India',
        postal_code: postal_code || null,
        gst_number: gst_number || null,
        website: website || null,
        timezone: timezone || 'Asia/Kolkata (UTC+05:30)',
        contact_numbers: parseJSONField(contact_numbers),
        tax_groups: parseJSONField(tax_groups),
        logo_url: logo_url,
        business_slug: organization_name?.toLowerCase().replace(/\s+/g, '-') || null,
        subscription_status: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      }, { transaction });
      
      console.log('✅ Created new tenant:', tenant.id);
      
      // Update user's tenant_id
      await User.update(
        { tenant_id: tenant.id },
        { where: { id: req.user.id }, transaction }
      );
    } else {
      // Update existing tenant
      const updateData = {
        organization_name: organization_name || tenant.organization_name,
        industry: industry !== undefined ? industry : tenant.industry,
        business_type: business_type !== undefined ? business_type : tenant.business_type,
        street_address: street_address !== undefined ? street_address : tenant.street_address,
        district: district !== undefined ? district : tenant.district,
        city: city !== undefined ? city : tenant.city,
        state: state !== undefined ? state : tenant.state,
        country: country || tenant.country,
        postal_code: postal_code !== undefined ? postal_code : tenant.postal_code,
        gst_number: gst_number !== undefined ? gst_number : tenant.gst_number,
        website: website !== undefined ? website : tenant.website,
        timezone: timezone || tenant.timezone,
        contact_numbers: parseJSONField(contact_numbers),
        tax_groups: parseJSONField(tax_groups)
      };
      
      // Handle logo update
      if (req.file && logo_url) {
        // Delete old logo if exists
        if (tenant.logo_url) {
          try {
            await deleteFromSupabase(tenant.logo_url);
          } catch (err) {
            console.error('❌ Error deleting old logo:', err);
          }
        }
        updateData.logo_url = logo_url;
      }
      
      // Update business slug if organization name changed
      if (organization_name && organization_name !== tenant.organization_name) {
        updateData.business_slug = organization_name.toLowerCase().replace(/\s+/g, '-');
      }
      
      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
      });
      
      console.log('📝 Update data:', updateData);
      
      await tenant.update(updateData, { transaction });
      console.log('✅ Updated tenant:', tenant.id);
    }
    
    await transaction.commit();
    
    // Get updated user with tenant
    const updatedUser = await User.findByPk(req.user.id, {
      include: [{ model: Tenant, as: 'tenant' }],
      attributes: { exclude: ['password'] }
    });
    
    res.status(200).json({
      success: true,
      message: tenant._previousDataValues ? 'Organization updated successfully' : 'Organization created successfully',
      data: {
        tenant: updatedUser?.tenant || tenant,
        user: updatedUser,
        hasOrganization: true,
        needsSetup: false
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Create/Update tenant error:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization name already exists' 
      });
    }
    
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors?.map(e => e.message).join(', ');
      return res.status(400).json({ 
        success: false, 
        message: messages || 'Validation error',
        errors: error.errors 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// ============ UPDATE TENANT BY ID ============
// @desc    Update tenant by ID
// @route   PUT /api/tenants/:id
// @access  Private
const updateTenantById = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { 
      organization_name, 
      industry, 
      business_type, 
      street_address, 
      district,
      city,
      state,
      country,
      postal_code,
      gst_number,
      website,
      timezone,
      contact_numbers,
      tax_groups
    } = req.body;
    
    console.log('📝 Update Tenant by ID:', id);
    console.log('📝 Request body:', req.body);
    console.log('📝 File:', req.file ? req.file.originalname : 'No file');
    
    // Find tenant by ID
    const tenant = await Tenant.findByPk(id);
    
    if (!tenant) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Tenant not found' 
      });
    }
    
    // Check if user has permission (admin or owner)
    if (req.user.role !== 'admin' && req.user.tenant_id !== tenant.id) {
      await transaction.rollback();
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    let logo_url = tenant.logo_url; // Keep existing logo by default
    
    // Handle logo upload
    if (req.file) {
      try {
        // Upload new logo
        const uploadResult = await uploadToSupabase(req.file, 'logos');
        console.log('✅ Logo upload result:', uploadResult);
        
        const newLogoUrl = extractLogoUrl(uploadResult);
        console.log('✅ New logo URL:', newLogoUrl);
        
        if (newLogoUrl) {
          // Delete old logo if exists
          if (tenant.logo_url) {
            try {
              await deleteFromSupabase(tenant.logo_url);
              console.log('✅ Old logo deleted');
            } catch (err) {
              console.error('❌ Error deleting old logo:', err);
            }
          }
          logo_url = newLogoUrl;
        }
      } catch (error) {
        console.error('❌ Logo upload error:', error);
      }
    }
    
    // Prepare update data
    const updateData = {
      logo_url: logo_url // ✅ Always a string or null
    };
    
    // Only add fields that are provided
    if (organization_name !== undefined) updateData.organization_name = organization_name;
    if (industry !== undefined) updateData.industry = industry;
    if (business_type !== undefined) updateData.business_type = business_type;
    if (street_address !== undefined) updateData.street_address = street_address;
    if (district !== undefined) updateData.district = district;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (country !== undefined) updateData.country = country;
    if (postal_code !== undefined) updateData.postal_code = postal_code;
    if (gst_number !== undefined) updateData.gst_number = gst_number;
    if (website !== undefined) updateData.website = website;
    if (timezone !== undefined) updateData.timezone = timezone;
    
    // Handle JSON fields
    if (contact_numbers !== undefined) {
      updateData.contact_numbers = Array.isArray(contact_numbers) 
        ? contact_numbers 
        : parseJSONField(contact_numbers);
    }
    
    if (tax_groups !== undefined) {
      updateData.tax_groups = Array.isArray(tax_groups) 
        ? tax_groups 
        : parseJSONField(tax_groups);
    }
    
    // Update business slug if organization name changed
    if (organization_name && organization_name !== tenant.organization_name) {
      updateData.business_slug = organization_name.toLowerCase().replace(/\s+/g, '-');
    }
    
    console.log('📝 Final update data:', JSON.stringify(updateData, null, 2));
    
    // Update tenant
    await tenant.update(updateData, { transaction });
    console.log('✅ Tenant updated successfully');
    
    await transaction.commit();
    
    // Get updated tenant
    const updatedTenant = await Tenant.findByPk(id);
    
    res.json({
      success: true,
      message: 'Tenant updated successfully',
      data: updatedTenant
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Update tenant error:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization name already exists' 
      });
    }
    
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors?.map(e => e.message).join(', ');
      return res.status(400).json({ 
        success: false, 
        message: messages || 'Validation error',
        errors: error.errors 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// ============ GET MY TENANT ============
// @desc    Get tenant details
// @route   GET /api/tenants/me
// @access  Private
const getMyTenant = async (req, res) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return res.status(404).json({ 
        success: false, 
        message: 'Organization not found',
        hasOrganization: false,
        needsSetup: true
      });
    }
    
    const tenant = await Tenant.findByPk(req.user.tenant_id, {
      include: [{ 
        model: User, 
        as: 'users', 
        attributes: ['id', 'name', 'email', 'role', 'is_active'] 
      }]
    });
    
    if (!tenant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Organization not found',
        hasOrganization: false,
        needsSetup: true
      });
    }
    
    const hasOrganization = !!(tenant.street_address && tenant.district);
    
    // Return ALL tenant fields
    const tenantData = {
      id: tenant.id,
      organization_name: tenant.organization_name,
      industry: tenant.industry,
      business_type: tenant.business_type,
      street_address: tenant.street_address,
      district: tenant.district,
      city: tenant.city,
      state: tenant.state,
      country: tenant.country,
      postal_code: tenant.postal_code,
      gst_number: tenant.gst_number,
      logo_url: tenant.logo_url,
      website: tenant.website,
      timezone: tenant.timezone,
      contact_numbers: tenant.contact_numbers,
      tax_groups: tenant.tax_groups,
      business_slug: tenant.business_slug,
      is_active: tenant.is_active,
      subscription_status: tenant.subscription_status,
      trial_ends_at: tenant.trial_ends_at,
      created_at: tenant.created_at,
      updated_at: tenant.updated_at,
      users: tenant.users || []
    };
    
    res.json({
      success: true,
      data: tenantData,
      hasOrganization,
      needsSetup: !hasOrganization
    });
  } catch (error) {
    console.error('❌ Get my tenant error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// ============ GET TENANT STATUS ============
// @desc    Check if tenant exists and is complete
// @route   GET /api/tenants/status
// @access  Private
const getTenantStatus = async (req, res) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return res.json({
        success: true,
        exists: false,
        hasOrganization: false,
        needsSetup: true,
        message: 'No organization found. Please create one.'
      });
    }
    
    const tenant = await Tenant.findByPk(req.user.tenant_id);
    
    if (!tenant) {
      return res.json({
        success: true,
        exists: false,
        hasOrganization: false,
        needsSetup: true,
        message: 'No organization found. Please create one.'
      });
    }
    
    const hasOrganization = !!(tenant.street_address && tenant.district);
    
    res.json({
      success: true,
      exists: true,
      hasOrganization,
      needsSetup: !hasOrganization,
      tenant: hasOrganization ? tenant : null,
      message: hasOrganization ? 'Organization is complete' : 'Organization needs setup'
    });
  } catch (error) {
    console.error('❌ Get tenant status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// ============ GET ALL TENANTS ============
// @desc    Get all tenants (Admin only)
// @route   GET /api/tenants
// @access  Private/Admin
const getAllTenants = async (req, res) => {
  try {
    const tenants = await Tenant.findAll({
      include: [{ 
        model: User, 
        as: 'users', 
        attributes: ['id', 'name', 'email', 'role'] 
      }],
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      success: true,
      data: tenants
    });
  } catch (error) {
    console.error('❌ Get all tenants error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// ============ GET TENANT BY ID ============
// @desc    Get tenant by ID
// @route   GET /api/tenants/:id
// @access  Private
const getTenantById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const tenant = await Tenant.findByPk(id, {
      include: [{ 
        model: User, 
        as: 'users', 
        attributes: ['id', 'name', 'email', 'role', 'is_active'] 
      }]
    });
    
    if (!tenant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tenant not found' 
      });
    }
    
    res.json({
      success: true,
      data: tenant
    });
  } catch (error) {
    console.error('❌ Get tenant by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// ============ DELETE TENANT ============
// @desc    Delete tenant
// @route   DELETE /api/tenants/:id
// @access  Private/Admin
const deleteTenant = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    const tenant = await Tenant.findByPk(id);
    
    if (!tenant) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Tenant not found' 
      });
    }
    
    // Delete logo from Supabase if exists
    if (tenant.logo_url) {
      try {
        await deleteFromSupabase(tenant.logo_url);
      } catch (err) {
        console.error('❌ Error deleting logo:', err);
      }
    }
    
    // Update users to remove tenant_id
    await User.update(
      { tenant_id: null },
      { where: { tenant_id: id }, transaction }
    );
    
    // Delete tenant
    await tenant.destroy({ transaction });
    
    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Tenant deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Delete tenant error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// ============ GET TENANT STATS ============
// @desc    Get tenant statistics
// @route   GET /api/tenants/:id/stats
// @access  Private
const getTenantStats = async (req, res) => {
  try {
    const { id } = req.params;
    
    const tenant = await Tenant.findByPk(id);
    
    if (!tenant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tenant not found' 
      });
    }
    
    const userCount = await User.count({ where: { tenant_id: id } });
    
    res.json({
      success: true,
      data: {
        tenant,
        userCount
      }
    });
  } catch (error) {
    console.error('❌ Get tenant stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

module.exports = { 
  createOrUpdateTenant,
  updateTenantById,
  getMyTenant,
  getTenantStatus,
  getAllTenants,
  getTenantById,
  deleteTenant,
  getTenantStats
};