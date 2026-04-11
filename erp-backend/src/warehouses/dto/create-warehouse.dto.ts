import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
export class CreateWarehouseDto {
  @ApiProperty({
    example: 'Main Distribution Center',
    description: 'The display name of the warehouse',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Dallas, TX',
    description: 'The location of the warehouse',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    example: 'Primary warehouse for all product categories',
    description: 'Optional description of the warehouse',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
