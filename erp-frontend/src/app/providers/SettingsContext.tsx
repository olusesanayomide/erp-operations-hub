import React, { createContext, useContext, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrencySettings, updateCurrencySettings } from '@/shared/lib/erp-api';

type CurrencySettings = {
  currencyCode: string;
  locale: string;
  exchangeRate: number;
};

type SettingsContextType = {
  currency: CurrencySettings;
  updateCurrency: (next: CurrencySettings) => Promise<void>;
  convertAmount: (amount: number) => number;
  formatMoney: (amount: number) => string;
  isLoading: boolean;
  isSaving: boolean;
};

const defaultCurrency: CurrencySettings = {
  currencyCode: 'USD',
  locale: 'en-US',
  exchangeRate: 1,
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: currency = defaultCurrency, isLoading } = useQuery({
    queryKey: ['settings', 'currency'],
    queryFn: getCurrencySettings,
  });

  const mutation = useMutation({
    mutationFn: updateCurrencySettings,
    onSuccess: (nextCurrency) => {
      queryClient.setQueryData(['settings', 'currency'], nextCurrency);
    },
  });

  const value = useMemo<SettingsContextType>(() => {
    const convertAmount = (amount: number) => amount * currency.exchangeRate;

    const formatMoney = (amount: number) =>
      new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.currencyCode,
        maximumFractionDigits: 2,
      }).format(convertAmount(amount));

    const updateCurrency = async (next: CurrencySettings) => {
      await mutation.mutateAsync(next);
    };

    return {
      currency,
      updateCurrency,
      convertAmount,
      formatMoney,
      isLoading,
      isSaving: mutation.isPending,
    };
  }, [currency, isLoading, mutation]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}
