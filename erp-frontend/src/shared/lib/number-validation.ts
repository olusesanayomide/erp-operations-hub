type NumericValidationResult =
  | {
      ok: true;
      value: number;
    }
  | {
      ok: false;
      message: string;
    };

function normalizeNumericInput(value: string) {
  return value.trim();
}

export function validatePositiveInteger(
  value: string,
  label: string,
): NumericValidationResult {
  const normalizedValue = normalizeNumericInput(value);

  if (!normalizedValue) {
    return { ok: false, message: `${label} is required.` };
  }

  if (!/^\d+$/.test(normalizedValue)) {
    return { ok: false, message: `${label} must be a whole number.` };
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    return { ok: false, message: `${label} must be greater than 0.` };
  }

  return { ok: true, value: parsedValue };
}

export function validateNonNegativeInteger(
  value: string,
  label: string,
): NumericValidationResult {
  const normalizedValue = normalizeNumericInput(value);

  if (!normalizedValue) {
    return { ok: false, message: `${label} is required.` };
  }

  if (!/^\d+$/.test(normalizedValue)) {
    return { ok: false, message: `${label} must be a whole number.` };
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 0) {
    return { ok: false, message: `${label} cannot be negative.` };
  }

  return { ok: true, value: parsedValue };
}

export function validatePositiveMoneyAmount(
  value: string,
  label: string,
): NumericValidationResult {
  const normalizedValue = normalizeNumericInput(value);

  if (!normalizedValue) {
    return { ok: false, message: `${label} is required.` };
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
    return {
      ok: false,
      message: `${label} must be a valid amount with up to 2 decimal places.`,
    };
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return { ok: false, message: `${label} must be greater than 0.` };
  }

  return { ok: true, value: parsedValue };
}
