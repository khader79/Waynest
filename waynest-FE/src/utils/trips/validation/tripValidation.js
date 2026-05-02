/**
 * Validation schemas for Trip Planner
 * Using manual validation (no external dependencies)
 */

/** Validation result type */

const hasOwn = (obj, key) =>
  Object.prototype.hasOwnProperty.call(obj ?? {}, key);

const toTrimmedString = (value) => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value).trim();
  }

  return "";
};

const toClampedInt = (value, fallback, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(parsed)));
};

const toBudget = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, parsed);
};

const toInterests = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toTrimmedString(item))
    .filter(Boolean);
};

const toDateInputValue = (value) => {
  const normalized = toTrimmedString(value);
  if (!normalized) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
};

/**
 * Validates trip form data
 */
export const validateTripForm = (data = {}) => {
  const errors = {};
  const normalizedData = sanitizeTripData(data);

  // City validation
  if (!normalizedData.cityId) {
    errors.cityId = "Please select a city";
  }

  // Days validation
  if (!normalizedData.days || normalizedData.days < 1) {
    errors.days = "Days must be at least 1";
  } else if (normalizedData.days > 14) {
    errors.days = "Maximum 14 days allowed";
  }

  // Budget validation
  if (!normalizedData.budget || normalizedData.budget <= 0) {
    errors.budget = "Budget must be greater than 0";
  } else if (normalizedData.budget > 1000000) {
    errors.budget = "Budget exceeds maximum allowed";
  }

  // Persons validation
  if (!normalizedData.persons || normalizedData.persons < 1) {
    errors.persons = "Number of persons must be at least 1";
  } else if (normalizedData.persons > 20) {
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
export const sanitizeTripData = (data = {}, options = {}) => {
  const partial = options?.partial === true;
  const source =
    data && typeof data === "object" && !Array.isArray(data) ? data : {};

  const normalized = {};

  if (!partial || hasOwn(source, "cityId")) {
    normalized.cityId = toTrimmedString(source.cityId);
  }

  if (!partial || hasOwn(source, "days")) {
    normalized.days = toClampedInt(source.days, 3, 1, 14);
  }

  if (!partial || hasOwn(source, "budget")) {
    normalized.budget = toBudget(source.budget, 0);
  }

  if (!partial || hasOwn(source, "persons")) {
    normalized.persons = toClampedInt(source.persons, 2, 1, 20);
  }

  if (!partial || hasOwn(source, "interests")) {
    normalized.interests = toInterests(source.interests);
  }

  if (!partial || hasOwn(source, "currencyCode")) {
    normalized.currencyCode = toTrimmedString(source.currencyCode) || "ILS";
  }

  if (!partial || hasOwn(source, "startDate")) {
    normalized.startDate = toDateInputValue(source.startDate);
  }

  return normalized;
};
