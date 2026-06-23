// models/Template.js - Complete with UPI and Typography Support

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Template = sequelize.define('Template', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  
  // ============ BASIC INFO ============
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Template name is required'
      },
      len: {
        args: [1, 255],
        msg: 'Template name must be between 1 and 255 characters'
      }
    }
  },
  
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: ''
  },
  
  invoice_title: {
    type: DataTypes.STRING(100),
    defaultValue: 'INVOICE',
    allowNull: false
  },
  
  // ============ LOGO ============
  company_logo_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: {
        msg: 'Logo URL must be a valid URL'
      }
    }
  },
  
  company_logo_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Storage path for logo file'
  },
  
  // ============ LAYOUT ============
  layout: {
    type: DataTypes.STRING(50),
    defaultValue: 'modern',
    allowNull: false,
    validate: {
      isIn: {
        args: [['modern', 'classic', 'minimal', 'elegant', 'corporate']],
        msg: 'Layout must be one of: modern, classic, minimal, elegant, corporate'
      }
    }
  },
  
  // ============ COLORS ============
  colors: {
    type: DataTypes.JSON,
    defaultValue: {
      primary: '#1F2937',
      accent: '#3B82F6',
      border: '#E5E7EB',
      text: '#111827',
      lightBg: '#F9FAFB',
      headingColor: '#1F2937',
      bodyColor: '#111827'
    },
    allowNull: false,
    validate: {
      isValidColors(value) {
        const required = ['primary', 'accent', 'border', 'text', 'lightBg', 'headingColor', 'bodyColor'];
        const missing = required.filter(key => !value[key]);
        if (missing.length > 0) {
          throw new Error(`Missing color keys: ${missing.join(', ')}`);
        }
      }
    }
  },
  
  // ============ FONTS (Backward Compatibility) ============
  fonts: {
    type: DataTypes.JSON,
    defaultValue: {
      heading: 'Inter',
      body: 'Inter'
    },
    allowNull: true,
    validate: {
      isValidFonts(value) {
        if (value && (!value.heading || !value.body)) {
          throw new Error('Fonts must have heading and body properties');
        }
      }
    }
  },
  
  // ============ TYPOGRAPHY (Main) ============
  typography: {
    type: DataTypes.JSON,
    defaultValue: {
      // Heading settings
      headingFont: 'Inter',
      headingSize: '28px',
      headingWeight: '700',
      headingTransform: 'uppercase',
      headingLetterSpacing: '1px',
      headingLineHeight: '1.3',
      // Body settings
      bodyFont: 'Inter',
      bodySize: '14px',
      bodyWeight: '400',
      bodyTransform: 'none',
      bodyLetterSpacing: '0px',
      bodyLineHeight: '1.6'
    },
    allowNull: false,
    validate: {
      isValidTypography(value) {
        const required = [
          'headingFont', 'headingSize', 'headingWeight', 'headingTransform',
          'headingLetterSpacing', 'headingLineHeight',
          'bodyFont', 'bodySize', 'bodyWeight', 'bodyTransform',
          'bodyLetterSpacing', 'bodyLineHeight'
        ];
        const missing = required.filter(key => !value[key]);
        if (missing.length > 0) {
          throw new Error(`Missing typography keys: ${missing.join(', ')}`);
        }
      }
    }
  },
  
  // ============ SECTIONS ============
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
    },
    allowNull: false,
    validate: {
      isValidSections(value) {
        const required = [
          'showLogo', 'showCompanyDetails', 'showInvoiceNo',
          'showDates', 'showBillTo', 'showItems', 'showNotes', 'showUpiQr'
        ];
        const missing = required.filter(key => !(key in value));
        if (missing.length > 0) {
          throw new Error(`Missing section keys: ${missing.join(', ')}`);
        }
        // Validate boolean values
        Object.entries(value).forEach(([key, val]) => {
          if (typeof val !== 'boolean') {
            throw new Error(`Section ${key} must be a boolean`);
          }
        });
      }
    }
  },
  
  // ============ ITEMS (Default Items) ============
  items: {
    type: DataTypes.JSON,
    defaultValue: [],
    allowNull: false,
    validate: {
      isValidItems(value) {
        if (!Array.isArray(value)) {
          throw new Error('Items must be an array');
        }
        value.forEach((item, index) => {
          if (!item.description) {
            throw new Error(`Item at index ${index} must have a description`);
          }
          if (typeof item.qty !== 'number' || item.qty < 0) {
            throw new Error(`Item at index ${index} must have a positive quantity`);
          }
          if (typeof item.rate !== 'number' || item.rate < 0) {
            throw new Error(`Item at index ${index} must have a positive rate`);
          }
        });
      }
    }
  },
  
  // ============ COMPANY DETAILS ============
  company_details: {
    type: DataTypes.JSON,
    defaultValue: {},
    allowNull: true,
    validate: {
      isValidCompanyDetails(value) {
        if (value && typeof value !== 'object') {
          throw new Error('Company details must be an object');
        }
      }
    }
  },
  
  // ============ BILL TO DETAILS ============
  bill_to_details: {
    type: DataTypes.JSON,
    defaultValue: {},
    allowNull: true,
    validate: {
      isValidBillToDetails(value) {
        if (value && typeof value !== 'object') {
          throw new Error('Bill to details must be an object');
        }
      }
    }
  },
  
  // ============ INVOICE DETAILS ============
  invoice_details: {
    type: DataTypes.JSON,
    defaultValue: {},
    allowNull: true,
    validate: {
      isValidInvoiceDetails(value) {
        if (value && typeof value !== 'object') {
          throw new Error('Invoice details must be an object');
        }
      }
    }
  },
  
  // ============ NOTES ============
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  },
  
  // ============ UPI DETAILS (Full Support) ============
  upi_details: {
    type: DataTypes.JSON,
    defaultValue: {
      upiId: '',
      payeeName: '',
      description: 'Invoice payment'
    },
    allowNull: true,
    validate: {
      isValidUpiDetails(value) {
        if (value && typeof value !== 'object') {
          throw new Error('UPI details must be an object');
        }
        // Validate UPI ID format if provided
        if (value && value.upiId && value.upiId.trim()) {
          const upiRegex = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;
          if (!upiRegex.test(value.upiId)) {
            throw new Error('Invalid UPI ID format. Format: username@provider');
          }
        }
      }
    },
    comment: 'UPI payment configuration: { upiId, payeeName, description }'
  },
  
  // ============ TENANT & USER ============
  tenant_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'tenants',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  }
}, {
  tableName: 'templates',
  timestamps: true,
  underscored: true,
  paranoid: false, // Soft delete disabled, use hard delete
  
  // Indexes for performance
  indexes: [
    {
      name: 'idx_templates_tenant_id',
      fields: ['tenant_id']
    },
    {
      name: 'idx_templates_created_by',
      fields: ['created_by']
    },
    {
      name: 'idx_templates_name',
      fields: ['name']
    },
    {
      name: 'idx_templates_created_at',
      fields: ['created_at']
    }
  ],
  
  // Hooks
  hooks: {
    beforeCreate: (template) => {
      // Ensure default values
      if (!template.colors) template.colors = Template.getDefaultColors();
      if (!template.typography) template.typography = Template.getDefaultTypography();
      if (!template.sections) template.sections = Template.getDefaultSections();
      if (!template.upi_details) template.upi_details = { upiId: '', payeeName: '', description: 'Invoice payment' };
      if (!template.items) template.items = [];
      
      // If UPI ID is provided but no description, set default
      if (template.upi_details?.upiId && !template.upi_details.description) {
        template.upi_details.description = 'Invoice payment';
      }
    },
    
    beforeUpdate: (template) => {
      // Clean up UPI details
      if (template.upi_details) {
        if (!template.upi_details.upiId) {
          template.upi_details = { upiId: '', payeeName: '', description: 'Invoice payment' };
        } else if (!template.upi_details.description) {
          template.upi_details.description = 'Invoice payment';
        }
      }
    }
  }
});

// ============ STATIC METHODS ============

// Get default colors
Template.getDefaultColors = function() {
  return {
    primary: '#1F2937',
    accent: '#3B82F6',
    border: '#E5E7EB',
    text: '#111827',
    lightBg: '#F9FAFB',
    headingColor: '#1F2937',
    bodyColor: '#111827'
  };
};

// Get default typography
Template.getDefaultTypography = function() {
  return {
    headingFont: 'Inter',
    headingSize: '28px',
    headingWeight: '700',
    headingTransform: 'uppercase',
    headingLetterSpacing: '1px',
    headingLineHeight: '1.3',
    bodyFont: 'Inter',
    bodySize: '14px',
    bodyWeight: '400',
    bodyTransform: 'none',
    bodyLetterSpacing: '0px',
    bodyLineHeight: '1.6'
  };
};

// Get default sections
Template.getDefaultSections = function() {
  return {
    showLogo: true,
    showCompanyDetails: true,
    showInvoiceNo: true,
    showDates: true,
    showBillTo: true,
    showItems: true,
    showNotes: true,
    showUpiQr: false
  };
};

// Get default fonts (backward compatibility)
Template.getDefaultFonts = function() {
  return {
    heading: 'Inter',
    body: 'Inter'
  };
};

// ============ INSTANCE METHODS ============

// Get full typography with fallbacks
Template.prototype.getFullTypography = function() {
  const typography = this.typography || Template.getDefaultTypography();
  const fonts = this.fonts || Template.getDefaultFonts();
  
  // Merge fonts into typography for backward compatibility
  return {
    ...typography,
    headingFont: typography.headingFont || fonts.heading || 'Inter',
    bodyFont: typography.bodyFont || fonts.body || 'Inter'
  };
};

// Get UPI details with defaults
Template.prototype.getUpiDetails = function() {
  return this.upi_details || { upiId: '', payeeName: '', description: 'Invoice payment' };
};

// Check if UPI is enabled
Template.prototype.isUpiEnabled = function() {
  const upi = this.getUpiDetails();
  return !!(upi.upiId && upi.upiId.trim());
};

// Generate UPI QR URL
Template.prototype.generateUpiQrUrl = function(amount = 0, description = '') {
  const upi = this.getUpiDetails();
  if (!upi.upiId) return null;
  
  const params = new URLSearchParams({
    pa: upi.upiId,
    pn: upi.payeeName || this.company_name || '',
    am: amount.toFixed(2),
    cu: 'INR',
    tn: description || upi.description || 'Invoice payment'
  });
  
  const upiUrl = `upi://pay?${params.toString()}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(upiUrl)}`;
};

// Get CSS for typography
Template.prototype.getTypographyCss = function() {
  const typography = this.getFullTypography();
  return {
    heading: {
      fontFamily: typography.headingFont,
      fontSize: typography.headingSize,
      fontWeight: typography.headingWeight,
      textTransform: typography.headingTransform,
      letterSpacing: typography.headingLetterSpacing,
      lineHeight: typography.headingLineHeight,
      color: this.colors?.headingColor || this.colors?.primary || '#1F2937'
    },
    body: {
      fontFamily: typography.bodyFont,
      fontSize: typography.bodySize,
      fontWeight: typography.bodyWeight,
      textTransform: typography.bodyTransform,
      letterSpacing: typography.bodyLetterSpacing,
      lineHeight: typography.bodyLineHeight,
      color: this.colors?.bodyColor || this.colors?.text || '#111827'
    }
  };
};

// Get section visibility
Template.prototype.getSectionVisibility = function(sectionName) {
  return this.sections?.[sectionName] ?? false;
};

// ============ EXPORT ============
module.exports = Template;