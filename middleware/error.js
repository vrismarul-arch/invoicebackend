const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;
  
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = err.errors.map(e => e.message).join(', ');
  }
  
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    message = 'Duplicate entry';
  }
  
  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : null
  });
};

const notFound = (req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
};

module.exports = { errorHandler, notFound };