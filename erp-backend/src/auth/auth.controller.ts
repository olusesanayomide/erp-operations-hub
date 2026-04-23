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
import { AcceptTenantInviteDto } from './dto/accept-tenant-invite.dto';
import { CreateTenantInviteDto } from './dto/create-tenant-invite.dto';
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

  @Post('invites/:token/accept')
  @Public()
  @ApiOperation({ summary: 'Accept a tenant invite and create a user' })
  @ApiResponse({ status: 201, description: 'Invite accepted.' })
  acceptTenantInvite(
    @Param('token') token: string,
    @Body() dto: AcceptTenantInviteDto,
  ) {
    return this.authService.acceptTenantInvite(token, dto);
  }

  @Get('invites/:token')
  @Public()
  @ApiOperation({ summary: 'Validate a tenant invite link' })
  @ApiResponse({ status: 200, description: 'Returns safe invite details.' })
  getTenantInvite(@Param('token') token: string) {
    return this.authService.getTenantInvite(token);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current logged-in user profile' })
  @ApiResponse({ status: 200, description: 'Returns user payload from token.' })
  getme(@GetUser() user: UserPayload) {
    return this.authService.serializeCurrentUser(user);
  }

  @Get('users')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List registered users' })
  @ApiResponse({ status: 200, description: 'Returns all registered users.' })
  @ApiResponse({ status: 403, description: 'Admin access required.' })
  listUsers(@GetUser() user: UserPayload) {
    return this.authService.listUsers(user);
  }

  @Post('invites')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a tenant invite' })
  @ApiResponse({ status: 201, description: 'Invite created.' })
  createTenantInvite(
    @GetUser() user: UserPayload,
    @Body() dto: CreateTenantInviteDto,
  ) {
    return this.authService.createTenantInvite(user, dto);
  }

  @Get('invites')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List pending tenant invites' })
  @ApiResponse({ status: 200, description: 'Returns pending invites.' })
  listTenantInvites(@GetUser() user: UserPayload) {
    return this.authService.listTenantInvites(user);
  }

  @Patch('invites/:inviteId/revoke')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Revoke a pending tenant invite' })
  @ApiResponse({ status: 200, description: 'Invite revoked.' })
  revokeTenantInvite(
    @GetUser() user: UserPayload,
    @Param('inviteId') inviteId: string,
  ) {
    return this.authService.revokeTenantInvite(user, inviteId);
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
