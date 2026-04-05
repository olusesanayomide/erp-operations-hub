import React, { createContext, useContext, useMemo, useState } from 'react';

type CurrencySettings = {
  currencyCode: string;
  locale: string;
  exchangeRate: number;
};

type SettingsContextType = {
  currency: CurrencySettings;
  updateCurrency: (next: CurrencySettings) => void;
  convertAmount: (amount: number) => number;
  formatMoney: (amount: number) => string;
};

const STORAGE_KEY = 'erp.settings.currency';

const defaultCurrency: CurrencySettings = {
  currencyCode: 'USD',
  locale: 'en-US',
  exchangeRate: 1,
};

const SettingsContext = createContext<SettingsContextType | null>(null);

function loadInitialSettings(): CurrencySettings {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultCurrency;

  try {
    const parsed = JSON.parse(raw) as Partial<CurrencySettings>;
    return {
      currencyCode: parsed.currencyCode || defaultCurrency.currencyCode,
      locale: parsed.locale || defaultCurrency.locale,
      exchangeRate:
        typeof parsed.exchangeRate === 'number' && parsed.exchangeRate > 0
          ? parsed.exchangeRate
          : defaultCurrency.exchangeRate,
    };
  } catch {
    return defaultCurrency;
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<CurrencySettings>(loadInitialSettings);

  const value = useMemo<SettingsContextType>(() => {
    const convertAmount = (amount: number) => amount * currency.exchangeRate;

    const formatMoney = (amount: number) =>
      new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.currencyCode,
        maximumFractionDigits: 2,
      }).format(convertAmount(amount));

    const updateCurrency = (next: CurrencySettings) => {
      setCurrency(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    };

    return {
      currency,
      updateCurrency,
      convertAmount,
      formatMoney,
    };
  }, [currency]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}
