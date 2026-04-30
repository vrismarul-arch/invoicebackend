const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const sequelize = require('./config/database');
const { errorHandler, notFound } = require('./middleware/error');

// Import routes
const authRoutes = require('./routes/authRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/invoices', invoiceRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'MySQL',
    storage: 'Local Filesystem'
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
    console.log('✅ MySQL database connected');
    
    // Sync models (use alter: true for development only)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Models synced');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 http://localhost:${PORT}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log(`📁 Uploads directory: ${path.join(__dirname, 'uploads')}`);
    });
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

startServer();