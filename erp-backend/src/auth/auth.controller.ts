import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupTenantDto } from './dto/signup-tenant.dto';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtGuard } from './guard/jwt.guard';
import { GetUser, UserPayload } from './decorator/get-user.decorator';
import { Public } from './decorator/public.decorator';
import { Roles } from './decorator/role.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from './enums/role.enum';

@ApiBearerAuth('access-token')
@UseGuards(JwtGuard)
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('signup-tenant')
  @ApiOperation({ summary: 'Create a tenant and its first admin user' })
  @ApiResponse({ status: 201, description: 'Tenant signup completed.' })
  signupTenant(@Body() dto: SignupTenantDto) {
    return this.authService.signupTenant(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current logged-in user profile' })
  @ApiResponse({ status: 200, description: 'Returns user payload from token.' })
  getme(@GetUser() user: UserPayload) {
    return this.authService.getCurrentUser(user.userId);
  }

  @Get('users')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List registered users' })
  @ApiResponse({ status: 200, description: 'Returns all registered users.' })
  @ApiResponse({ status: 403, description: 'Admin access required.' })
  listUsers(@GetUser() user: UserPayload) {
    return this.authService.listUsers(user);
  }

  @Patch('users/:userId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a user name or role' })
  @ApiResponse({ status: 200, description: 'User updated successfully.' })
  @ApiResponse({ status: 403, description: 'Admin access required.' })
  updateUser(
    @GetUser() user: UserPayload,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.authService.updateUser(user, userId, dto);
  }

  @Get('tenants')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all tenants (platform admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all tenants.' })
  @ApiResponse({
    status: 403,
    description: 'Platform admin access required.',
  })
  listTenants(@GetUser() user: UserPayload) {
    return this.authService.listTenants(user);
  }

  @Patch('tenants/:tenantId/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update tenant status (platform admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant status updated.' })
  @ApiResponse({
    status: 403,
    description: 'Platform admin access required.',
  })
  updateTenantStatus(
    @GetUser() user: UserPayload,
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateTenantStatusDto,
  ) {
    return this.authService.updateTenantStatus(user, tenantId, dto);
  }
}
