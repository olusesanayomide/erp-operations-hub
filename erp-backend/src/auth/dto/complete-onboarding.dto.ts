import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteOnboardingDto {
  @ApiProperty({ example: 'Acme Incorporated' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiPropertyOptional({
    example: 'acme-incorporated',
    description:
      'Optional workspace slug. Generated from company name when omitted.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @ApiPropertyOptional({ example: 'Jane Founder' })
  @IsOptional()
  @IsString()
  adminName?: string;
}
