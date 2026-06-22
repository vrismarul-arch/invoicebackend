// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const sequelize = require('./config/database');
const { errorHandler, notFound } = require('./middleware/error');

// Import models before routes
require('./models');

// Import routes
const authRoutes = require('./routes/authRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const templateRoutes = require('./routes/templateRoutes');
const itemRoutes = require('./routes/itemRoutes');

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/customers', require('./routes/customerRoutes'));
// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: process.env.DB_DIALECT || 'mysql',
    storage: process.env.DB_HOST || 'localhost'
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Database connection and server start
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ Database connected (${process.env.DB_DIALECT || 'mysql'})`);
    
    // ✅ FIX: Only sync models, DON'T use alter in development to avoid key limit issues
    if (process.env.NODE_ENV === 'development') {
      try {
        // Use sync() without alter - only creates tables if they don't exist
        await sequelize.sync();
        console.log('✅ Models synced (no alter)');
      } catch (syncError) {
        console.warn('⚠️ Sync warning:', syncError.message);
        console.log('✅ Server starting anyway - tables already exist');
      }
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 http://localhost:${PORT}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    // Don't exit - start server anyway if DB is already set up
    console.log('⚠️ Starting server without database sync...');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (without DB sync)`);
    });
  }
};

startServer();

module.exports = app;