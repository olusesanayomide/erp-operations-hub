import {
  IsUUID,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupTenantDto {
  @ApiPropertyOptional({
    example: 'a2d6c4ee-3aaf-4ac9-92d0-4d54e1ef7b5c',
    description:
      'Supabase auth user id created by the email verification signup flow.',
  })
  @IsOptional()
  @IsUUID()
  authUserId?: string;

  @ApiPropertyOptional({ example: 'Acme Incorporated' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    required: false,
    example: 'acme',
    description:
      'Optional tenant slug. Generated from company name when omitted.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @ApiPropertyOptional({ example: 'Jane Founder' })
  @IsOptional()
  @IsString()
  adminName?: string;

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
