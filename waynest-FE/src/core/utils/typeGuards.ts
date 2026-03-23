/**
 * Unified Type Guards
 * Centralized type guard utilities for safe runtime type checking
 */

/**
 * Type guard to check if a value is a plain object record
 */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Type guard to check if a value is a string
 */
export const isString = (value: unknown): value is string =>
  typeof value === 'string';

/**
 * Type guard to check if a value is an array
 */
export const isArray = <T>(value: unknown): value is T[] =>
  Array.isArray(value);

/**
 * Type guard to check if a value is a number
 */
export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Type guard to check if a value is a boolean
 */
export const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean';

/**
 * Type guard to check if a value is null or undefined
 */
export const isNil = (value: unknown): value is null | undefined =>
  value === null || value === undefined;

/**
 * Type guard to extract a string property from an object
 */
export const extractStringProperty = <T extends Record<string, unknown>>(
  obj: T,
  key: string,
  fallback: string = ''
): string => {
  const value = obj[key];
  return isString(value) ? value : fallback;
};

/**
 * Type guard to extract a number property from an object
 */
export const extractNumberProperty = <T extends Record<string, unknown>>(
  obj: T,
  key: string,
  fallback: number = 0
): number => {
  const value = obj[key];
  if (isNumber(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Type guard to extract an array property from an object
 */
export const extractArrayProperty = <T extends Record<string, unknown>, V>(
  obj: T,
  key: string
): V[] => {
  const value = obj[key];
  return isArray<V>(value) ? value : [];
};

/**
 * Type guard to extract a boolean property from an object
 */
export const extractBooleanProperty = <T extends Record<string, unknown>>(
  obj: T,
  key: string,
  fallback: boolean = false
): boolean => {
  const value = obj[key];
  return isBoolean(value) ? value : fallback;
};
