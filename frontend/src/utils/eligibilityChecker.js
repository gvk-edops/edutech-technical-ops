import { addYears, isAfter } from './dateCalculations.js';

/**
 * Maximum increments allowed per class
 */
const MAX_INCREMENTS = {
  '3': 120, // Class 3: 10 years × 12 months
  '2': 120, // Class 2: 10 years × 12 months
  '1': 60   // Class 1: 5 years × 12 months
};

/**
 * Check EB exam eligibility based on current class
 * @param {Object} employee - Employee data with career dates and promotions
 * @param {Array} ebExams - Array of EB exam records
 * @param {Array} promotions - Array of promotion records
 * @returns {Object} - { status, blockReason, ebRequired, gracePeriodEnd }
 */
export const checkEBEligibility = (employee, ebExams, promotions) => {
  const today = new Date();
  const currentClass = employee.current_class;
  
  let gracePeriodStart;
  let gracePeriodEnd;
  let ebRequired;

  // Determine which EB level is required based on current class
  if (currentClass === '3') {
    // Class 3 requires EB Level I
    gracePeriodStart = new Date(employee.career_st_date);
    gracePeriodEnd = addYears(gracePeriodStart, 3);
    ebRequired = 'I';
    
  } else if (currentClass === '2') {
    // Class 2 requires EB Level II
    const class2Promotion = promotions.find(p => p.level === 'II');
    
    if (!class2Promotion) {
      // No promotion to Class 2 found - should not happen
      return {
        status: 'blocked',
        blockReason: 'No Class 2 promotion record found',
        ebRequired: 'II',
        gracePeriodEnd: null
      };
    }
    
    gracePeriodStart = new Date(class2Promotion.promotion_date);
    gracePeriodEnd = addYears(gracePeriodStart, 3);
    ebRequired = 'II';
    
  } else if (currentClass === '1') {
    // Class 1 requires EB Level III
    const class1Promotion = promotions.find(p => p.level === 'III');
    
    if (!class1Promotion) {
      return {
        status: 'blocked',
        blockReason: 'No Class 1 promotion record found',
        ebRequired: 'III',
        gracePeriodEnd: null
      };
    }
    
    gracePeriodStart = new Date(class1Promotion.promotion_date);
    gracePeriodEnd = addYears(gracePeriodStart, 3);
    ebRequired = 'III';
    
  } else {
    // Unknown class
    return {
      status: 'valid',
      blockReason: null,
      ebRequired: null,
      gracePeriodEnd: null
    };
  }

  // Check if we're still in grace period
  if (today <= gracePeriodEnd) {
    return {
      status: 'valid',
      blockReason: null,
      ebRequired,
      gracePeriodEnd
    };
  }

  // Grace period ended - check if EB exam is passed
  const ebPassed = ebExams.some(exam => exam.level === ebRequired);

  if (!ebPassed) {
    return {
      status: 'blocked',
      blockReason: `EB Level ${ebRequired} exam not passed after 3 years of service`,
      ebRequired,
      gracePeriodEnd
    };
  }

  return {
    status: 'valid',
    blockReason: null,
    ebRequired,
    gracePeriodEnd
  };
};

/**
 * Check if employee is eligible for promotion
 * @param {Object} employee - Employee data
 * @param {Array} increments - Salary increment records
 * @param {Array} ebExams - EB exam records
 * @param {Array} promotions - Promotion records
 * @returns {Object} - { eligible, reason, nextClass }
 */
export const checkPromotionEligibility = (employee, increments, ebExams, promotions) => {
  const currentClass = employee.current_class;

  if (currentClass === '3') {
    // Check Class 3 → Class 2 promotion
    const totalIncrements = increments.length;
    const ebLevelIPassed = ebExams.some(exam => exam.level === 'I');

    if (totalIncrements < MAX_INCREMENTS['3']) {
      return {
        eligible: false,
        reason: `Need ${MAX_INCREMENTS['3']} increments. Currently has ${totalIncrements}`,
        nextClass: '2'
      };
    }

    if (!ebLevelIPassed) {
      return {
        eligible: false,
        reason: 'EB Level I exam not passed',
        nextClass: '2'
      };
    }

    return {
      eligible: true,
      reason: null,
      nextClass: '2'
    };

  } else if (currentClass === '2') {
    // Check Class 2 → Class 1 promotion
    const class2Promotion = promotions.find(p => p.level === 'II');
    
    if (!class2Promotion) {
      return {
        eligible: false,
        reason: 'No Class 2 promotion record found',
        nextClass: '1'
      };
    }

    // Count increments after Class 2 promotion
    const class2PromotionDate = new Date(class2Promotion.promotion_date);
    const incrementsAfterClass2 = increments.filter(inc => 
      new Date(inc.effective_date) >= class2PromotionDate
    ).length;

    const ebLevelIIPassed = ebExams.some(exam => exam.level === 'II');

    if (incrementsAfterClass2 < MAX_INCREMENTS['2']) {
      return {
        eligible: false,
        reason: `Need ${MAX_INCREMENTS['2']} increments in Class 2. Currently has ${incrementsAfterClass2}`,
        nextClass: '1'
      };
    }

    if (!ebLevelIIPassed) {
      return {
        eligible: false,
        reason: 'EB Level II exam not passed',
        nextClass: '1'
      };
    }

    return {
      eligible: true,
      reason: null,
      nextClass: '1'
    };

  } else if (currentClass === '1') {
    // Already in Class 1 - no further promotion
    return {
      eligible: false,
      reason: 'Already in highest class (Class 1)',
      nextClass: null
    };
  }

  return {
    eligible: false,
    reason: 'Unknown class',
    nextClass: null
  };
};

/**
 * Get EB exam status summary
 * @param {Array} ebExams - Array of EB exam records
 * @returns {Object} - { eb1_status, eb2_status, eb3_status }
 */
export const getEBExamStatus = (ebExams) => {
  return {
    eb1_status: ebExams.some(exam => exam.level === 'I') ? 'pass' : 'pending',
    eb2_status: ebExams.some(exam => exam.level === 'II') ? 'pass' : 'pending',
    eb3_status: ebExams.some(exam => exam.level === 'III') ? 'pass' : 'pending'
  };
};