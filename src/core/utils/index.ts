import {DEFAULT_CURRENCY} from '../constants/currencies';

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
