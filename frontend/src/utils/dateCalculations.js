/**
 * Add months to a date
 */
export const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

/**
 * Add years to a date
 */
export const addYears = (date, years) => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
};

/**
 * Calculate years between two dates
 */
export const calculateYearsDifference = (startDate, endDate = new Date()) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const years = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < start.getDate())) {
    return years - 1;
  }
  
  return years;
};

/**
 * Calculate months between two dates
 */
export const calculateMonthsDifference = (startDate, endDate = new Date()) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const yearsDiff = end.getFullYear() - start.getFullYear();
  const monthsDiff = end.getMonth() - start.getMonth();
  
  return yearsDiff * 12 + monthsDiff;
};

/**
 * Format date to MySQL DATE format (YYYY-MM-DD)
 */
export const formatDateForMySQL = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Check if date is before another date
 */
export const isBefore = (date1, date2) => {
  return new Date(date1) < new Date(date2);
};

/**
 * Check if date is after another date
 */
export const isAfter = (date1, date2) => {
  return new Date(date1) > new Date(date2);
};

/**
 * Get today's date in MySQL format
 */
export const getTodayMySQL = () => {
  return formatDateForMySQL(new Date());
};


