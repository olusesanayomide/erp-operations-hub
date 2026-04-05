import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export const CUSTOMER_IMPORT_MODES = ['create', 'upsert'] as const;
export type CustomerImportMode = (typeof CUSTOMER_IMPORT_MODES)[number];

export class CustomerImportDto {
  @ApiProperty({
    description: 'Raw CSV content containing customer rows.',
    example:
      'name,email,phone,address\nAcme Corp,billing@acme.com,+1234567890,123 Business Lane',
  })
  @IsString()
  @MinLength(1)
  csv: string;

  @ApiProperty({
    description: 'Import behavior for rows whose email already exists.',
    enum: CUSTOMER_IMPORT_MODES,
    required: false,
    default: 'upsert',
  })
  @IsOptional()
  @IsIn(CUSTOMER_IMPORT_MODES)
  mode?: CustomerImportMode;
}
