import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

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
}
