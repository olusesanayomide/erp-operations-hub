import { Controller, Get, UseGuards } from '@nestjs/common';
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
import { DashboardService } from './dashboard.service';

@ApiBearerAuth('access-token')
@UseGuards(JwtGuard, RolesGuard)
@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Get dashboard summary',
    description:
      'Returns tenant-scoped aggregate counts, inventory health, order status counts, chart data, and recent order rows for the dashboard.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary retrieved successfully.',
  })
  getSummary(@GetUser() user: UserPayload) {
    return this.dashboardService.getSummary(user.tenantId);
  }
}
