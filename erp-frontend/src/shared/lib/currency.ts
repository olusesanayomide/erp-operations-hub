export type CurrencySettingsLike = {
  currencyCode?: string | null;
  locale?: string | null;
  exchangeRate?: number | null;
};

export const DEFAULT_CURRENCY_SETTINGS = {
  currencyCode: 'USD',
  locale: 'en-US',
  exchangeRate: 1,
} as const;

const CURRENCY_SYMBOL_FALLBACKS: Record<string, string> = {
  NGN: '₦',
};

export function isValidLocale(locale: string) {
  const trimmed = locale.trim();

  if (!trimmed) {
    return false;
  }

  return Intl.NumberFormat.supportedLocalesOf([trimmed]).length > 0;
}

export function isValidCurrencyCode(currencyCode: string, locale = DEFAULT_CURRENCY_SETTINGS.locale) {
  const trimmed = currencyCode.trim().toUpperCase();

  if (!trimmed) {
    return false;
  }

  try {
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: trimmed,
    });

    return true;
  } catch {
    return false;
  }
}

export function resolveCurrencySettings(settings: CurrencySettingsLike) {
  const normalizedLocale = settings.locale?.trim() || DEFAULT_CURRENCY_SETTINGS.locale;
  const locale = isValidLocale(normalizedLocale)
    ? normalizedLocale
    : DEFAULT_CURRENCY_SETTINGS.locale;

  const normalizedCode = settings.currencyCode?.trim().toUpperCase() || DEFAULT_CURRENCY_SETTINGS.currencyCode;
  const currencyCode = isValidCurrencyCode(normalizedCode, locale)
    ? normalizedCode
    : DEFAULT_CURRENCY_SETTINGS.currencyCode;

  const exchangeRate =
    typeof settings.exchangeRate === 'number' && Number.isFinite(settings.exchangeRate) && settings.exchangeRate > 0
      ? settings.exchangeRate
      : DEFAULT_CURRENCY_SETTINGS.exchangeRate;

  return {
    currencyCode,
    locale,
    exchangeRate,
  };
}

export function formatCurrencyAmount(amount: number, settings: CurrencySettingsLike) {
  const resolved = resolveCurrencySettings(settings);
  const formatter = new Intl.NumberFormat(resolved.locale, {
    style: 'currency',
    currency: resolved.currencyCode,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 2,
  });
  const parts = formatter.formatToParts(amount * resolved.exchangeRate);
  const fallbackSymbol = CURRENCY_SYMBOL_FALLBACKS[resolved.currencyCode];

  if (!fallbackSymbol) {
    return parts.map((part) => part.value).join('');
  }

  return parts
    .map((part) =>
      part.type === 'currency' && part.value === resolved.currencyCode
        ? fallbackSymbol
        : part.value,
    )
    .join('');
}
