import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Global Tech Corp' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, example: 'sales@globaltech.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false, example: '+123456789' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false, example: '123 Business Ave, Tech City' })
  @IsString()
  @IsOptional()
  address?: string;
}
