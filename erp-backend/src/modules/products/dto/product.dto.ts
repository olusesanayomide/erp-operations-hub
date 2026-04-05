// products/dto/product.dto.ts
import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsIn,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProductDto {
  @ApiProperty({ description: 'Name of the product' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'SKU of the product' })
  @IsString()
  sku: string;

  @ApiProperty({ description: 'Price of the product' })
  @IsNumber()
  @Min(0)
  price: number;
}

export class UpdateProductDto {
  @ApiProperty({ description: 'Name of the product', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'SKU of the product', required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ description: 'Price of the product', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

export const PRODUCT_IMPORT_MODES = ['create', 'upsert'] as const;
export type ProductImportMode = (typeof PRODUCT_IMPORT_MODES)[number];

export class ProductImportDto {
  @ApiProperty({
    description: 'Raw CSV content containing product rows.',
    example: 'name,sku,price\nWidget A,SKU-001,49.99',
  })
  @IsString()
  @MinLength(1)
  csv: string;

  @ApiProperty({
    description: 'Import behavior for rows whose SKU already exists.',
    enum: PRODUCT_IMPORT_MODES,
    required: false,
    default: 'upsert',
  })
  @IsOptional()
  @IsIn(PRODUCT_IMPORT_MODES)
  mode?: ProductImportMode;
}
