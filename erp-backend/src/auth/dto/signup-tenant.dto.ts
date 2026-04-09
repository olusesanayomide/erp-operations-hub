import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupTenantDto {
  @ApiProperty({ example: 'Acme Incorporated' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({
    required: false,
    example: 'acme',
    description: 'Optional tenant slug. Generated from company name when omitted.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @ApiProperty({ example: 'Jane Founder' })
  @IsString()
  @IsNotEmpty()
  adminName: string;

  @ApiProperty({ example: 'founder@acme.com' })
  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  @ApiProperty({ example: 'StrongPassword123!', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  adminPassword: string;
}
