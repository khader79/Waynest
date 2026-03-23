/**
 * Formatters for Trip Planner
 */

/**
 * Formats a date string for display
 */
export const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

/**
 * Formats currency amount
 */
export const formatCurrency = (amount: number, currency = 'ILS'): string => {
  return new Intl.NumberFormat('en-IL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Formats a city label from city data
 */
export const formatCityLabel = (cityName: string, stateName?: string | null): string => {
  if (stateName) {
    return `${cityName} (${stateName})`;
  }
  return cityName;
};

/**
 * Formats duration string
 */
export const formatDuration = (duration: string): string => {
  // If duration is already formatted, return as-is
  if (duration.match(/^\d+\s*(hour|min|hr|minute)/i)) {
    return duration;
  }
  
  // Try to parse numeric duration
  const match = duration.match(/^(\d+)\s*(h|hr|hours?|m|min|minutes?)?$/i);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = (match[2] || 'h').toLowerCase();
    
    if (unit.startsWith('m')) {
      return `${value} min`;
    }
    return `${value} hr${value !== 1 ? 's' : ''}`;
  }
  
  return duration;
};

/**
 * Formats percentage
 */
export const formatPercentage = (value: number, decimals = 0): string => {
  return `${value.toFixed(decimals)}%`;
};
