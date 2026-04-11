import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsInt,
  IsNumber,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseLifecycleStatus } from '../purchase-status.enum';

export class PurchaseItemDto {
  @ApiProperty({ example: 'uuid-of-product' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 150.0, description: 'Price per single unit' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price: number;
}

export class CreatePurchaseDto {
  @ApiProperty({ example: 'PO-2026-001' })
  @IsString()
  @IsNotEmpty()
  purchaseOrder: string;

  @ApiProperty({ example: 'uuid-of-warehouse' })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ example: 'uuid-of-supplier' })
  @IsUUID()
  supplierId: string;

  // Note: TotalAmount and PurchaseDate are usually handled by the server (Date.now)
  // but if you want to allow manual input, keep these:

  @ApiProperty({ type: [PurchaseItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto) // Crucial for nested validation and Swagger UI
  items: PurchaseItemDto[];
}

export class UpdatePurchaseStatusDto {
  @ApiProperty({
    example: PurchaseLifecycleStatus.CONFIRMED,
    enum: PurchaseLifecycleStatus,
    description: 'New status of the purchase order',
  })
  @IsEnum(PurchaseLifecycleStatus)
  status: PurchaseLifecycleStatus;
}
