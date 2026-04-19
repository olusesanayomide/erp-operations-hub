import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCurrencySettingsDto {
  @ApiProperty({ example: 'USD' })
  @IsString()
  currencyCode: string;

  @ApiProperty({ example: 'en-US' })
  @IsString()
  locale: string;

  @ApiProperty({ example: 1, minimum: 0.0001 })
  @IsNumber()
  @Min(0.0001)
  exchangeRate: number;

  @ApiProperty({
    required: false,
    description:
      'Tenant updatedAt value from when the settings form loaded. Used to detect stale updates.',
  })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}
