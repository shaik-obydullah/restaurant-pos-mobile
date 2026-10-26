import {DEFAULT_CURRENCY} from '../constants/currencies';
import {LineExtra} from '../../types';

// Pure-JS RFC4122 v4 UUID generator.
// The `uuid` package relies on crypto.getRandomValues(), which is not
// available in React Native/Hermes without an extra native polyfill.
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

// Convert raw enum values into readable labels.
// e.g. dineIn -> Dine In, takeAway -> Take Away, pickUp -> Pick Up, cash -> Cash
export const humanize = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

export const formatCurrency = (amount: number, symbol?: string): string => {
  const currencySymbol = symbol || DEFAULT_CURRENCY.symbol;
  return `${currencySymbol}${amount.toFixed(2)}`;
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB');
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-GB');
};

// Split a comma/newline separated ingredient string, trimming blanks and duplicates.
export const parseIngredientList = (value?: string | null): string[] => {
  if (!value) {
    return [];
  }
  return value
    .split(/[,\n]/)
    .map(item => item.trim())
    .filter(
      (item, index, all) =>
        !!item &&
        all.findIndex(other => other.toLowerCase() === item.toLowerCase()) === index,
    );
};

// Render ingredients consistently, e.g. "Cream · Oreo sprinkles · Chocolate sauce".
export const formatIngredientList = (value?: string | null): string =>
  parseIngredientList(value).join(' · ');

// Parse the JSON snapshot of paid extras stored on a cart line or sale detail.
export const parseLineExtras = (value?: string | null): LineExtra[] => {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(item => item && typeof item.name === 'string')
      .map(item => ({
        id: typeof item.id === 'number' ? item.id : undefined,
        name: item.name,
        price: Number(item.price) || 0,
      }));
  } catch {
    return [];
  }
};
