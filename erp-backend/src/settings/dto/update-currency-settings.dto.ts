import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';

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
}
