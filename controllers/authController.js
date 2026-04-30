const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const sequelize = require('../config/database');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Register user with tenant
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { name, email, password, company } = req.body;
    
    // Check if user exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }
    
    // Create tenant
    const tenant = await Tenant.create({
      organization_name: company,
      subscription_status: 'trial',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    }, { transaction });
    
    // Create user
    const user = await User.create({
      name,
      email,
      password,
      tenant_id: tenant.id,
      role: 'admin'
    }, { transaction });
    
    await transaction.commit();
    
    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;
    
    // Check if tenant has complete details
    const hasOrganization = !!(tenant.street_address && tenant.district);
    
    res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        tenant: {
          id: tenant.id,
          organization_name: tenant.organization_name,
          subscription_status: tenant.subscription_status,
          trial_ends_at: tenant.trial_ends_at,
          logo_url: tenant.logo_url,
          hasOrganization: hasOrganization
        },
        token: generateToken(user.id),
        hasOrganization,
        needsSetup: !hasOrganization
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { email, password } = req.body;
    
    // Find user with tenant
    const user = await User.findOne({
      where: { email },
      include: [{ 
        model: Tenant, 
        as: 'tenant',
        attributes: ['id', 'organization_name', 'industry', 'business_type', 
                     'street_address', 'district', 'gst_number', 'logo_url',
                     'subscription_status', 'trial_ends_at', 'is_active']
      }]
    });
    
    if (!user || !user.is_active) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Update last login
    await user.update({ last_login_at: new Date() });
    
    // Check tenant subscription
    const tenant = user.tenant;
    if (!tenant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Organization not found. Please contact support.' 
      });
    }
    
    if (tenant.subscription_status === 'suspended') {
      return res.status(403).json({ 
        success: false, 
        message: 'Your organization account is suspended' 
      });
    }
    
    // Check if organization has complete details
    const hasOrganization = !!(tenant.street_address && tenant.district);
    
    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;
    
    res.json({
      success: true,
      access_token: generateToken(user.id),
      tenant_id: tenant.id,
      user: {
        id: userResponse.id,
        name: userResponse.name,
        email: userResponse.email,
        role: userResponse.role,
        is_active: userResponse.is_active
      },
      tenant: {
        id: tenant.id,
        organization_name: tenant.organization_name,
        industry: tenant.industry,
        business_type: tenant.business_type,
        street_address: tenant.street_address,
        district: tenant.district,
        gst_number: tenant.gst_number,
        logo_url: tenant.logo_url,
        subscription_status: tenant.subscription_status,
        trial_ends_at: tenant.trial_ends_at,
        hasOrganization: hasOrganization
      },
      hasOrganization,
      needsSetup: !hasOrganization
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Get current user with organization
// @route   GET /api/auth/me
// @access  Private
// @desc    Get current user with organization
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{ 
        model: Tenant, 
        as: 'tenant',
        attributes: [
          'id', 'organization_name', 'industry', 'business_type', 
          'street_address', 'district', 'city', 'state', 'country',
          'postal_code', 'gst_number', 'logo_url', 'website', 'timezone',
          'contact_numbers', 'tax_groups', 'business_slug',
          'subscription_status', 'trial_ends_at', 'is_active'
        ]
      }]
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Check if organization has complete details
    const hasOrganization = !!(user.tenant && user.tenant.street_address && user.tenant.district);
    
    // Format tenant data with all fields
    const tenantData = user.tenant ? {
      id: user.tenant.id,
      organization_name: user.tenant.organization_name,
      industry: user.tenant.industry,
      business_type: user.tenant.business_type,
      street_address: user.tenant.street_address,
      district: user.tenant.district,
      city: user.tenant.city,
      state: user.tenant.state,
      country: user.tenant.country,
      postal_code: user.tenant.postal_code,
      gst_number: user.tenant.gst_number,
      logo_url: user.tenant.logo_url,
      website: user.tenant.website,
      timezone: user.tenant.timezone,
      contact_numbers: user.tenant.contact_numbers,
      tax_groups: user.tenant.tax_groups,
      business_slug: user.tenant.business_slug,
      subscription_status: user.tenant.subscription_status,
      trial_ends_at: user.tenant.trial_ends_at,
      is_active: user.tenant.is_active
    } : null;
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_active: user.is_active
        },
        tenant: tenantData,
        hasOrganization,
        needsSetup: !hasOrganization
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};
// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // Logout is handled on the client side by removing the token
    // This endpoint is just for consistency
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Get organization details by user
// @route   GET /api/auth/organization
// @access  Private
const getMyOrganization = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Tenant, as: 'tenant' }]
    });
    
    if (!user || !user.tenant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Organization not found' 
      });
    }
    
    const tenant = user.tenant;
    
    res.json({
      success: true,
      data: {
        id: tenant.id,
        organization_name: tenant.organization_name,
        industry: tenant.industry,
        business_type: tenant.business_type,
        street_address: tenant.street_address,
        district: tenant.district,
        gst_number: tenant.gst_number,
        logo_url: tenant.logo_url,
        subscription_status: tenant.subscription_status,
        trial_ends_at: tenant.trial_ends_at,
        is_active: tenant.is_active,
        created_at: tenant.created_at,
        hasOrganization: !!(tenant.street_address && tenant.district)
      }
    });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findByPk(req.user.id);
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Generate reset token
    const resetToken = jwt.sign(
      { id: user.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );
    
    // In production, send email with reset link
    // For now, just return the token
    res.json({
      success: true,
      message: 'Password reset email sent',
      resetToken // Remove this in production
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

module.exports = { 
  register, 
  login, 
  getMe, 
  logout,
  getMyOrganization,
  changePassword,
  forgotPassword,
  resetPassword
};