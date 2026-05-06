import React, { createContext, useContext, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrencySettings, updateCurrencySettings } from '@/shared/lib/erp-api';
import {
  DEFAULT_CURRENCY_SETTINGS,
  formatCurrencyAmount,
  resolveCurrencySettings,
} from '@/shared/lib/currency';

type CurrencySettings = {
  currencyCode: string;
  locale: string;
  exchangeRate: number;
  updatedAt?: string;
};

type SettingsContextType = {
  currency: CurrencySettings;
  updateCurrency: (next: CurrencySettings) => Promise<void>;
  convertAmount: (amount: number) => number;
  formatMoney: (amount: number) => string;
  isLoading: boolean;
  isSaving: boolean;
};

const defaultCurrency: CurrencySettings = DEFAULT_CURRENCY_SETTINGS;

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
    const resolvedCurrency = resolveCurrencySettings(currency);
    const convertAmount = (amount: number) => amount * resolvedCurrency.exchangeRate;

    const formatMoney = (amount: number) => formatCurrencyAmount(amount, currency);

    const updateCurrency = async (next: CurrencySettings) => {
      await mutation.mutateAsync({
        ...next,
        expectedUpdatedAt: currency.updatedAt,
      });
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
