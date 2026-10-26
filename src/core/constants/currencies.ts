export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  {code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka'},
  {code: 'USD', symbol: '$', name: 'US Dollar'},
  {code: 'EUR', symbol: '€', name: 'Euro'},
  {code: 'GBP', symbol: '£', name: 'British Pound'},
  {code: 'INR', symbol: '₹', name: 'Indian Rupee'},
  {code: 'PKR', symbol: '₨', name: 'Pakistani Rupee'},
  {code: 'LKR', symbol: '₨', name: 'Sri Lankan Rupee'},
  {code: 'JPY', symbol: '¥', name: 'Japanese Yen'},
  {code: 'CAD', symbol: 'C$', name: 'Canadian Dollar'},
  {code: 'AUD', symbol: 'A$', name: 'Australian Dollar'},
];

export const DEFAULT_CURRENCY = {code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka'};
