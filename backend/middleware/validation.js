/**
 * Validate salary increment request
 */
export const validateIncrementRequest = (req, res, next) => {
  const { effective_date } = req.body;
  const { employeeId } = req.params;

  // Validate employee ID
  if (!employeeId || isNaN(employeeId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid employee ID'
    });
  }

  // Validate effective date format if provided
  if (effective_date && !isValidDate(effective_date)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid effective date format. Use YYYY-MM-DD'
    });
  }

  next();
};

/**
 * Validate promotion request
 */
export const validatePromotionRequest = (req, res, next) => {
  const { promotion_date } = req.body;
  const { employeeId } = req.params;

  // Validate employee ID
  if (!employeeId || isNaN(employeeId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid employee ID'
    });
  }

  // Validate promotion date format if provided
  if (promotion_date && !isValidDate(promotion_date)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid promotion date format. Use YYYY-MM-DD'
    });
  }

  next();
};

/**
 * Validate employee ID parameter
 */
export const validateEmployeeId = (req, res, next) => {
  const { employeeId } = req.params;

  if (!employeeId || isNaN(employeeId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid employee ID'
    });
  }

  next();
};

/**
 * Helper function to validate date format
 */
const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};