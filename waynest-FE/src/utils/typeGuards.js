/**
 * Unified Type Guards
 * Centralized type guard utilities for safe runtime type checking
 */

/**
 * Type guard to check if a value is a plain object record
 */
export const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Type guard to check if a value is a string
 */
export const isString = (value) => typeof value === "string";

/**
 * Type guard to check if a value is an array
 */
export const isArray = (value) => Array.isArray(value);

/**
 * Type guard to check if a value is a number
 */
export const isNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

/**
 * Type guard to check if a value is a boolean
 */
export const isBoolean = (value) => typeof value === "boolean";

/**
 * Type guard to check if a value is null or undefined
 */
export const isNil = (value) => value === null || value === undefined;

/**
 * Type guard to extract a string property from an object
 */
export const extractStringProperty = (obj, key, fallback = "") => {
  const value = obj[key];
  return isString(value) ? value : fallback;
};

/**
 * Type guard to extract a number property from an object
 */
export const extractNumberProperty = (obj, key, fallback = 0) => {
  const value = obj[key];
  if (isNumber(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Type guard to extract an array property from an object
 */
export const extractArrayProperty = (obj, key) => {
  const value = obj[key];
  return isArray(value) ? value : [];
};

/**
 * Type guard to extract a boolean property from an object
 */
export const extractBooleanProperty = (obj, key, fallback = false) => {
  const value = obj[key];
  return isBoolean(value) ? value : fallback;
};
