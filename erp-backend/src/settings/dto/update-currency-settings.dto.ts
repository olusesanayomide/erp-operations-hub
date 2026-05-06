import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Matches,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

function isSupportedLocale(value: string) {
  return Intl.NumberFormat.supportedLocalesOf([value]).length > 0;
}

function isSupportedCurrencyCode(value: string) {
  try {
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: value,
    });
    return true;
  } catch {
    return false;
  }
}

function IsSupportedLocale(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSupportedLocale',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && value.length > 0 && isSupportedLocale(value);
        },
      },
    });
  };
}

function IsSupportedCurrencyCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSupportedCurrencyCode',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && value.length === 3 && isSupportedCurrencyCode(value);
        },
      },
    });
  };
}

export class UpdateCurrencySettingsDto {
  @ApiProperty({ example: 'USD' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{3}$/, {
    message: 'currencyCode must be a valid 3-letter currency code.',
  })
  @IsSupportedCurrencyCode({
    message: 'currencyCode must be a supported currency code like USD, EUR, or NGN.',
  })
  currencyCode: string;

  @ApiProperty({ example: 'en-US' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @IsSupportedLocale({
    message: 'locale must be a supported locale like en-US or en-NG.',
  })
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
