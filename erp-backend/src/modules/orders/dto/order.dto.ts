// orders.dto.ts
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsPositive,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderLifecycleStatus } from '../order-status.enum';

export class CreateOrderDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customerId?: string;
}

export class AddOrderItemDto {
  @ApiProperty({ description: 'ID of the product' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'ID of the product' })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ description: 'Quantity of the product' })
  @IsInt()
  @IsPositive()
  quantity: number;
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'New status of the order',
    enum: OrderLifecycleStatus,
  })
  @IsEnum(OrderLifecycleStatus)
  status: OrderLifecycleStatus;
}
