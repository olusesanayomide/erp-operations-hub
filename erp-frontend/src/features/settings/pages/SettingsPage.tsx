import { useEffect, useState } from 'react';
import { PageHeader } from '@/shared/components/PageComponents';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Settings } from 'lucide-react';
import { useSettings } from '@/app/providers/SettingsContext';
import { useAuth } from '@/app/providers/AuthContext';
import { toast } from 'sonner';
import { LoadingText } from '@/shared/components/LoadingMotion';

export default function SettingsPage() {
  const { currency, updateCurrency, formatMoney, isLoading, isSaving } = useSettings();
  const { hasRole } = useAuth();
  const canManageCurrency = hasRole(['admin', 'manager']);

  const [form, setForm] = useState({
    currencyCode: currency.currencyCode,
    locale: currency.locale,
    exchangeRate: String(currency.exchangeRate),
  });

  useEffect(() => {
    setForm({
      currencyCode: currency.currencyCode,
      locale: currency.locale,
      exchangeRate: String(currency.exchangeRate),
    });
  }, [currency.currencyCode, currency.locale, currency.exchangeRate]);

  const handleSave = async () => {
    const exchangeRate = Number(form.exchangeRate);

    if (!form.currencyCode.trim() || !form.locale.trim() || !(exchangeRate > 0)) {
      toast.error('Currency code, locale, and a valid exchange rate are required');
      return;
    }

    try {
      await updateCurrency({
        currencyCode: form.currencyCode.trim().toUpperCase(),
        locale: form.locale.trim(),
        exchangeRate,
      });
      toast.success('Currency settings updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save currency settings');
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Settings" description="Application configuration" />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="erp-card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Currency Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure how prices and totals are displayed across the ERP.
              </p>
            </div>
          </div>

          {isLoading && (
            <p className="text-sm text-muted-foreground">
              <LoadingText>Loading tenant currency settings...</LoadingText>
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currencyCode">Currency Code</Label>
              <Input
                id="currencyCode"
                value={form.currencyCode}
                onChange={(event) => setForm((current) => ({ ...current, currencyCode: event.target.value }))}
                placeholder="USD"
                disabled={!canManageCurrency}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="locale">Locale</Label>
              <Input
                id="locale"
                value={form.locale}
                onChange={(event) => setForm((current) => ({ ...current, locale: event.target.value }))}
                placeholder="en-US"
                disabled={!canManageCurrency}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="exchangeRate">Exchange Rate From USD</Label>
            <Input
              id="exchangeRate"
              type="number"
              step="0.0001"
              value={form.exchangeRate}
              onChange={(event) => setForm((current) => ({ ...current, exchangeRate: event.target.value }))}
              placeholder="1"
              disabled={!canManageCurrency}
            />
            <p className="text-xs text-muted-foreground">
              The system stores amounts in USD base values and converts them for display using this rate.
            </p>
          </div>

          {canManageCurrency ? (
            <div className="flex justify-end">
              <Button requiresOnline onClick={handleSave} disabled={isLoading || isSaving}>
                {isSaving ? <LoadingText>Saving...</LoadingText> : 'Save Currency Settings'}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Only admins and managers can change currency settings.
            </p>
          )}
        </div>

        <div className="erp-card p-6 space-y-4">
          <h3 className="font-semibold">Preview</h3>
          <p className="text-sm text-muted-foreground">
            This is how prices and totals will appear throughout the app.
          </p>

          <div className="rounded-2xl bg-muted/40 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Product Price</span>
              <span className="font-medium">{formatMoney(125.5)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Order Total</span>
              <span className="font-medium">{formatMoney(2450.75)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Purchase Total</span>
              <span className="font-medium">{formatMoney(8200)}</span>
            </div>
          </div>

          <div className="rounded-2xl border p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active Currency</span>
              <span className="font-medium">{currency.currencyCode}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted-foreground">Locale</span>
              <span className="font-medium">{currency.locale}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted-foreground">Exchange Rate</span>
              <span className="font-medium">{currency.exchangeRate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

