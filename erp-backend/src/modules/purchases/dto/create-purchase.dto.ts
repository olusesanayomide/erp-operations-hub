import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseItemDto {
  @ApiProperty({ example: 'uuid-of-product' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 150.0, description: 'Price per single unit' })
  @IsNumber()
  price: number;
}

export class CreatePurchaseDto {
  @ApiProperty({ example: 'PO-2026-001' })
  @IsString()
  @IsNotEmpty()
  purchaseOrder: string;

  @ApiProperty({ example: 'uuid-of-warehouse' })
  @IsString()
  warehouseId: string;

  @ApiProperty({ example: 'uuid-of-supplier' })
  @IsString() // Changed to string to match common UUID practices
  supplierId: string;

  // Note: TotalAmount and PurchaseDate are usually handled by the server (Date.now)
  // but if you want to allow manual input, keep these:

  @ApiProperty({ type: [PurchaseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto) // Crucial for nested validation and Swagger UI
  items: PurchaseItemDto[];
}
