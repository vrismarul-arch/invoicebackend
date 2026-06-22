// middleware/validation.js

const validateItem = (req, res, next) => {
  const { name, type, sellingPrice, selling_price, stock } = req.body;
  const errors = [];

  // Normalize field names (handle both camelCase and snake_case from frontend)
  const itemName = name;
  const itemType = type;
  const itemSellingPrice = sellingPrice || selling_price;

  // Required fields
  if (!itemName || itemName.trim() === '') {
    errors.push('Item name is required');
  }

  if (!itemType || !['goods', 'service'].includes(itemType)) {
    errors.push('Valid type (goods or service) is required');
  }

  // Selling price validation
  if (itemSellingPrice !== undefined && itemSellingPrice !== null && itemSellingPrice !== '') {
    const price = parseFloat(itemSellingPrice);
    if (isNaN(price) || price < 0) {
      errors.push('Selling price must be a valid positive number');
    }
  } else {
    errors.push('Selling price is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// IMPORTANT: Export the function
module.exports = { validateItem };