import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

export enum TenantStatusValue {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
}

export class UpdateTenantStatusDto {
  @ApiProperty({
    enum: TenantStatusValue,
    example: TenantStatusValue.SUSPENDED,
  })
  @IsEnum(TenantStatusValue)
  status: TenantStatusValue;

  @ApiProperty({
    required: false,
    description:
      'Tenant updatedAt value from when the admin loaded the tenant list. Used to detect stale updates.',
  })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}
