import {v4 as uuidv4} from 'uuid';

export const generateUUID = (): string => {
  return uuidv4();
};

export const formatCurrency = (amount: number): string => {
  return `৳${amount.toFixed(2)}`;
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB');
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-GB');
};
