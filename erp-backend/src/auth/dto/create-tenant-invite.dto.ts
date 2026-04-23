import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '../enums/role.enum';

export class CreateTenantInviteDto {
  @ApiProperty({ example: 'staff@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: Role, example: Role.STAFF })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({ example: 'Jane Staff' })
  @IsOptional()
  @IsString()
  name?: string;
}
