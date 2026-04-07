/**
 * Validation schemas for Trip Planner
 * Using manual validation (no external dependencies)
 */

/** Validation result type */

/**
 * Validates trip form data
 */
export const validateTripForm = (data) => {
  const errors = {};

  // City validation
  if (!data.cityId || data.cityId.trim() === "") {
    errors.cityId = "Please select a city";
  }

  // Days validation
  if (!data.days || data.days < 1) {
    errors.days = "Days must be at least 1";
  } else if (data.days > 14) {
    errors.days = "Maximum 14 days allowed";
  }

  // Budget validation
  if (!data.budget || data.budget <= 0) {
    errors.budget = "Budget must be greater than 0";
  } else if (data.budget > 1000000) {
    errors.budget = "Budget exceeds maximum allowed";
  }

  // Persons validation
  if (!data.persons || data.persons < 1) {
    errors.persons = "Number of persons must be at least 1";
  } else if (data.persons > 20) {
    errors.persons = "Maximum 20 travelers allowed";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Checks if budget is too low for the trip parameters
 */
export const isBudgetTooLow = (budget, persons, days) => {
  const minimumBudget = calculateMinimumBudget(persons, days);
  return budget < minimumBudget;
};

/**
 * Calculates minimum recommended budget
 */
export const calculateMinimumBudget = (persons, days) => {
  // Base rate of 100 ILS per person per day
  return persons * days * 100;
};

/**
 * Sanitizes form data before sending to API
 */
export const sanitizeTripData = (data) => {
  return {
    cityId: data.cityId.trim(),
    days: Math.max(1, Math.min(14, data.days)),
    budget: Math.max(0, data.budget),
    persons: Math.max(1, Math.min(20, data.persons)),
    interests: data.interests?.filter(Boolean) ?? [],
  };
};
