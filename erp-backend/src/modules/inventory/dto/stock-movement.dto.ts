import { IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StockMovementDto {
  @ApiProperty({ description: 'ID of the product' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'ID of the warehouse' })
  @IsString()
  warehouseId: string;

  @ApiProperty({ description: 'Quantity of the stock movement' })
  @IsInt()
  @Min(1)
  quantity: number;
}
