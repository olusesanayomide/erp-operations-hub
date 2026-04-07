import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class TransferStockDto {
  @ApiProperty({ description: 'ID of the product to transfer' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'ID of the source warehouse' })
  @IsString()
  sourceWarehouseId: string;

  @ApiProperty({ description: 'ID of the destination warehouse' })
  @IsString()
  destinationWarehouseId: string;

  @ApiProperty({ description: 'Quantity to transfer between warehouses' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Reason or note for the transfer' })
  @IsString()
  @MinLength(1)
  note: string;
}
