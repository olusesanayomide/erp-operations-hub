import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { Role } from '../enums/role.enum';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: Role, example: Role.MANAGER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({
    description:
      'User updatedAt value from when the admin loaded the user list. Used to detect stale updates.',
  })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}
