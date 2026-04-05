import { BadRequestException } from '@nestjs/common';
import { CustomerImportMode } from './dto/customer-import.dto';

type CsvRecord = Record<string, string>;
type CustomerImportAction = 'create' | 'update';

export interface CustomerImportRowPreview {
  rowNumber: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  action: CustomerImportAction | null;
  issues: string[];
}

export interface CustomerImportPreviewResult {
  mode: CustomerImportMode;
  totals: {
    rows: number;
    valid: number;
    invalid: number;
    creates: number;
    updates: number;
  };
  rows: CustomerImportRowPreview[];
}

const HEADER_ALIASES = {
  name: ['name', 'customername', 'company', 'companyname'],
  email: ['email', 'emailaddress', 'customeremail'],
  phone: ['phone', 'phonenumber', 'mobile', 'telephone'],
  address: ['address', 'streetaddress', 'location'],
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
  return normalizedHeaders.findIndex((header) => aliases.includes(header as never));
}

function parseCsvRecords(csv: string): CsvRecord[] {
  const parsedRows = parseCsvLinearly(csv.trim());
  if (parsedRows.length === 0) {
    throw new BadRequestException('CSV is empty.');
  }

  const headers = parsedRows[0];
  const nameIndex = resolveHeader(headers, 'name');
  const emailIndex = resolveHeader(headers, 'email');
  const phoneIndex = resolveHeader(headers, 'phone');
  const addressIndex = resolveHeader(headers, 'address');

  if (nameIndex === -1 || emailIndex === -1) {
    throw new BadRequestException('CSV must include name and email columns.');
  }

  return parsedRows.slice(1).map((row) => ({
    name: row[nameIndex] ?? '',
    email: row[emailIndex] ?? '',
    phone: phoneIndex === -1 ? '' : row[phoneIndex] ?? '',
    address: addressIndex === -1 ? '' : row[addressIndex] ?? '',
  }));
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function buildCustomerImportPreview(
  csv: string,
  mode: CustomerImportMode,
  existingEmails: string[],
): CustomerImportPreviewResult {
  const records = parseCsvRecords(csv);
  const existingEmailSet = new Set(existingEmails.map((email) => email.trim().toLowerCase()));
  const emailOccurrences = new Map<string, number>();

  for (const record of records) {
    const normalizedEmail = record.email.trim().toLowerCase();
    if (!normalizedEmail) continue;
    emailOccurrences.set(normalizedEmail, (emailOccurrences.get(normalizedEmail) ?? 0) + 1);
  }

  const rows: CustomerImportRowPreview[] = records.map((record, index) => {
    const rowNumber = index + 2;
    const name = record.name.trim();
    const email = record.email.trim();
    const normalizedEmail = email.toLowerCase();
    const phone = record.phone.trim();
    const address = record.address.trim();
    const issues: string[] = [];

    if (!name) issues.push('Name is required.');
    if (!email) {
      issues.push('Email is required.');
    } else if (!isValidEmail(email)) {
      issues.push('Email must be valid.');
    }

    if (normalizedEmail && (emailOccurrences.get(normalizedEmail) ?? 0) > 1) {
      issues.push('Duplicate email found in this file.');
    }

    const existsInDatabase = normalizedEmail ? existingEmailSet.has(normalizedEmail) : false;
    let action: CustomerImportAction | null = null;

    if (issues.length === 0) {
      if (existsInDatabase) {
        if (mode === 'create') {
          issues.push('Email already exists in the customer registry.');
        } else {
          action = 'update';
        }
      } else {
        action = 'create';
      }
    }

    return { rowNumber, name, email, phone, address, action, issues };
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
