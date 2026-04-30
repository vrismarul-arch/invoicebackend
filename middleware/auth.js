const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });
      
      if (!req.user || !req.user.is_active) {
        return res.status(401).json({ 
          success: false,
          message: 'Not authorized' 
        });
      }
      
      console.log('Authenticated user:', {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        tenant_id: req.user.tenant_id
      });
      
      next();
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, token failed' 
      });
    }
  }

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Not authorized, no token' 
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      message: 'Admin access required' 
    });
  }
  next();
};

module.exports = { protect, adminOnly };