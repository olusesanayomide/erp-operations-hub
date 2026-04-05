import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateCustomerDto {
  @IsString()
  @ApiProperty({
    example: 'Manifest Corp',
    description: 'The legal name of the customer',
  })
  @IsNotEmpty()
  name: string;

  @IsString()
  @ApiProperty({ example: 'billing@manifest.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  phone?: string;

  @IsString()
  @ApiProperty({ example: '123 Business Lane, NY', required: false })
  @IsOptional()
  address?: string;
}
