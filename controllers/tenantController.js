const { validationResult } = require('express-validator');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const sequelize = require('../config/database');
const { uploadToSupabase, deleteFromSupabase } = require('../middleware/upload');

// Helper function to parse JSON fields
const parseJSONField = (value) => {
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return [];
    }
  }
  return value;
};

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
        logo_url = await uploadToSupabase(req.file, 'logos');
        console.log('✅ Logo saved to:', logo_url);
      } catch (error) {
        console.error('❌ Logo upload error:', error);
        // Don't fail the request, just log error
        // You can still save the tenant without logo
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
        street_address,
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
        business_slug: organization_name.toLowerCase().replace(/\s+/g, '-'),
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
        street_address: street_address || tenant.street_address,
        district: district || tenant.district,
        city: city || tenant.city,
        state: state || tenant.state,
        country: country || tenant.country,
        postal_code: postal_code || tenant.postal_code,
        gst_number: gst_number !== undefined ? gst_number : tenant.gst_number,
        website: website !== undefined ? website : tenant.website,
        timezone: timezone || tenant.timezone,
        contact_numbers: parseJSONField(contact_numbers),
        tax_groups: parseJSONField(tax_groups)
      };
      
      // Handle logo update
      if (req.file) {
        if (tenant.logo_url) {
          await deleteFromSupabase(tenant.logo_url);
        }
        updateData.logo_url = logo_url;
      }
      
      // Update business slug if organization name changed
      if (organization_name && organization_name !== tenant.organization_name) {
        updateData.business_slug = organization_name.toLowerCase().replace(/\s+/g, '-');
      }
      
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
      message: tenant.wasCreated ? 'Organization created successfully' : 'Organization updated successfully',
      data: {
        tenant: updatedUser.tenant,
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
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

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
    
    // Find tenant by ID
    const tenant = await Tenant.findByPk(id);
    
    if (!tenant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tenant not found' 
      });
    }
    
    // Check if user has permission
    if (req.user.role !== 'admin' && req.user.tenant_id !== tenant.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    let logo_url = tenant.logo_url;
    
    // Handle logo upload
    if (req.file) {
      if (tenant.logo_url) {
        await deleteFromSupabase(tenant.logo_url);
      }
      logo_url = await uploadToSupabase(req.file, 'logos');
      console.log('✅ Logo saved to:', logo_url);
    }
    
    // Prepare update data with all fields
    const updateData = {
      organization_name: organization_name || tenant.organization_name,
      industry: industry !== undefined ? industry : tenant.industry,
      business_type: business_type !== undefined ? business_type : tenant.business_type,
      street_address: street_address || tenant.street_address,
      district: district || tenant.district,
      city: city || tenant.city,
      state: state || tenant.state,
      country: country || tenant.country,
      postal_code: postal_code || tenant.postal_code,
      gst_number: gst_number !== undefined ? gst_number : tenant.gst_number,
      website: website !== undefined ? website : tenant.website,
      timezone: timezone || tenant.timezone,
      logo_url: logo_url,
      contact_numbers: parseJSONField(contact_numbers),
      tax_groups: parseJSONField(tax_groups)
    };
    
    // Update business slug if organization name changed
    if (organization_name && organization_name !== tenant.organization_name) {
      updateData.business_slug = organization_name.toLowerCase().replace(/\s+/g, '-');
    }
    
    // Update tenant
    await tenant.update(updateData, { transaction });
    console.log('✅ Tenant updated successfully');
    
    await transaction.commit();
    
    // Get updated tenant with all fields
    const updatedTenant = await Tenant.findByPk(id, {
      include: [{ model: User, as: 'users', attributes: ['id', 'name', 'email'] }]
    });
    
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
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

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

module.exports = { 
  createOrUpdateTenant,
  getMyTenant,
  getTenantStatus,
  updateTenantById
};