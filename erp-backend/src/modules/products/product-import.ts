import { BadRequestException } from '@nestjs/common';
import { ProductImportMode } from './dto/product.dto';

type CsvRecord = Record<string, string>;

export type ProductImportAction = 'create' | 'update';

export interface ProductImportRowPreview {
  rowNumber: number;
  name: string;
  sku: string;
  price: number | null;
  minStock: number | null;
  action: ProductImportAction | null;
  issues: string[];
}

export interface ProductImportPreviewResult {
  mode: ProductImportMode;
  totals: {
    rows: number;
    valid: number;
    invalid: number;
    creates: number;
    updates: number;
  };
  rows: ProductImportRowPreview[];
}

const HEADER_ALIASES = {
  name: ['name', 'productname', 'product'],
  sku: ['sku', 'productsku', 'code', 'itemcode'],
  price: ['price', 'unitprice', 'baseprice', 'cost'],
  minStock: ['minstock', 'minimumstock', 'reorderlevel', 'threshold'],
} as const;

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseCsvLinearly(csv: string): string[][] {
  const rows: string[][] = [];
  let currentValue = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = '';
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  if (inQuotes) {
    throw new BadRequestException('CSV contains an unclosed quoted value.');
  }

  return rows
    .map((row) => row.map((cell) => cell.replace(/^\uFEFF/, '').trim()))
    .filter((row) => row.some((cell) => cell.length > 0));
}

function resolveHeader(headers: string[], target: keyof typeof HEADER_ALIASES) {
  const normalizedHeaders = headers.map(normalizeHeader);
  const aliases = HEADER_ALIASES[target];

  return normalizedHeaders.findIndex((header) =>
    aliases.includes(header as never),
  );
}

function parseCsvRecords(csv: string): CsvRecord[] {
  const parsedRows = parseCsvLinearly(csv.trim());
  if (parsedRows.length === 0) {
    throw new BadRequestException('CSV is empty.');
  }

  const headers = parsedRows[0];
  const nameIndex = resolveHeader(headers, 'name');
  const skuIndex = resolveHeader(headers, 'sku');
  const priceIndex = resolveHeader(headers, 'price');
  const minStockIndex = resolveHeader(headers, 'minStock');

  if (
    nameIndex === -1 ||
    skuIndex === -1 ||
    priceIndex === -1 ||
    minStockIndex === -1
  ) {
    throw new BadRequestException(
      'CSV must include name, sku, price, and minStock columns.',
    );
  }

  return parsedRows.slice(1).map((row) => ({
    name: row[nameIndex] ?? '',
    sku: row[skuIndex] ?? '',
    price: row[priceIndex] ?? '',
    minStock: row[minStockIndex] ?? '',
  }));
}

export function buildProductImportPreview(
  csv: string,
  mode: ProductImportMode,
  existingSkus: string[],
): ProductImportPreviewResult {
  const records = parseCsvRecords(csv);
  const existingSkuSet = new Set(
    existingSkus.map((sku) => sku.trim().toUpperCase()),
  );
  const skuOccurrences = new Map<string, number>();

  for (const record of records) {
    const normalizedSku = record.sku.trim().toUpperCase();
    if (!normalizedSku) {
      continue;
    }
    skuOccurrences.set(
      normalizedSku,
      (skuOccurrences.get(normalizedSku) ?? 0) + 1,
    );
  }

  const rows: ProductImportRowPreview[] = records.map((record, index) => {
    const rowNumber = index + 2;
    const name = record.name.trim();
    const sku = record.sku.trim();
    const normalizedSku = sku.toUpperCase();
    const rawPrice = record.price.trim();
    const parsedPrice = rawPrice ? Number(rawPrice) : Number.NaN;
    const rawMinStock = record.minStock.trim();
    const parsedMinStock = rawMinStock ? Number(rawMinStock) : Number.NaN;
    const issues: string[] = [];

    if (!name) {
      issues.push('Name is required.');
    }

    if (!sku) {
      issues.push('SKU is required.');
    }

    if (!rawPrice) {
      issues.push('Price is required.');
    } else if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      issues.push('Price must be a valid number greater than or equal to 0.');
    }

    if (!rawMinStock) {
      issues.push('Min stock is required.');
    } else if (!Number.isFinite(parsedMinStock) || parsedMinStock < 0) {
      issues.push(
        'Min stock must be a valid number greater than or equal to 0.',
      );
    }

    if (normalizedSku && (skuOccurrences.get(normalizedSku) ?? 0) > 1) {
      issues.push('Duplicate SKU found in this file.');
    }

    const existsInDatabase = normalizedSku
      ? existingSkuSet.has(normalizedSku)
      : false;
    let action: ProductImportAction | null = null;

    if (issues.length === 0) {
      if (existsInDatabase) {
        if (mode === 'create') {
          issues.push('SKU already exists in the catalog.');
        } else {
          action = 'update';
        }
      } else {
        action = 'create';
      }
    }

    return {
      rowNumber,
      name,
      sku,
      price: Number.isFinite(parsedPrice) ? parsedPrice : null,
      minStock: Number.isFinite(parsedMinStock) ? parsedMinStock : null,
      action,
      issues,
    };
  });

  const validRows = rows.filter((row) => row.issues.length === 0);

  return {
    mode,
    totals: {
      rows: rows.length,
      valid: validRows.length,
      invalid: rows.length - validRows.length,
      creates: validRows.filter((row) => row.action === 'create').length,
      updates: validRows.filter((row) => row.action === 'update').length,
    },
    rows,
  };
}
