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
    example: 'Main Distribution Center',
    description: 'The display name of the warehouse',
  })
  @IsString()
  @IsOptional()
  location?: string;
}
