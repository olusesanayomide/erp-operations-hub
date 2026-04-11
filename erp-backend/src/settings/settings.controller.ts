import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser, UserPayload } from 'src/auth/decorator/get-user.decorator';
import { Roles } from 'src/auth/decorator/role.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { UpdateCurrencySettingsDto } from './dto/update-currency-settings.dto';
import { SettingsService } from './settings.service';

@ApiBearerAuth('access-token')
@UseGuards(JwtGuard, RolesGuard)
@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('currency')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({ summary: 'Get tenant currency settings' })
  @ApiResponse({
    status: 200,
    description: 'Currency settings retrieved successfully.',
  })
  getCurrencySettings(@GetUser() user: UserPayload) {
    return this.settingsService.getCurrencySettings(user.tenantId);
  }

  @Patch('currency')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update tenant currency settings' })
  @ApiResponse({
    status: 200,
    description: 'Currency settings updated successfully.',
  })
  updateCurrencySettings(
    @Body() dto: UpdateCurrencySettingsDto,
    @GetUser() user: UserPayload,
  ) {
    return this.settingsService.updateCurrencySettings(user.tenantId, dto);
  }
}
