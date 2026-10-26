import {create} from 'zustand';
import {Currency, DEFAULT_CURRENCY} from '../core/constants/currencies';

interface AppState {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

export const useAppStore = create<AppState>(set => ({
  isLoading: false,
  setLoading: (loading: boolean) => set({isLoading: loading}),
  currency: DEFAULT_CURRENCY,
  setCurrency: (currency: Currency) => set({currency}),
}));
