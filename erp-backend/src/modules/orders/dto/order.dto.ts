// orders.dto.ts
import {
  IsArray,
  IsInt,
  ValidateNested,
  IsOptional,
  IsString,
  IsUUID,
  IsPositive,
  IsEnum,
  IsISO8601,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderLifecycleStatus } from '../order-status.enum';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'ID of the product' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'ID of the warehouse' })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ description: 'Quantity of the product' })
  @IsInt()
  @IsPositive()
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({
    description: 'Initial draft line items to create atomically with the order',
    type: [CreateOrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

export class AddOrderItemDto extends CreateOrderItemDto {}

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'New status of the order',
    enum: OrderLifecycleStatus,
  })
  @IsEnum(OrderLifecycleStatus)
  status: OrderLifecycleStatus;

  @ApiProperty({
    required: false,
    description:
      'Order updatedAt value from when the user loaded the record. Used to detect stale updates.',
  })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}
