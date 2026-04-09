import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { SignupTenantDto } from './dto/signup-tenant.dto';
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
  @Post('register')
  @ApiOperation({
    summary: 'Deprecated: user creation is handled by Supabase auth',
  })
  @ApiResponse({
    status: 410,
    description: 'Authentication is managed by Supabase.',
  })
  register(@Body() _dto: CreateUserDto) {
    return this.authService.assertSupabaseManagedAuth();
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Deprecated: login is handled by Supabase auth' })
  @ApiResponse({
    status: 410,
    description: 'Authentication is managed by Supabase.',
  })
  login(@Body() _dto: LoginDto) {
    return this.authService.assertSupabaseManagedAuth();
  }

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
}
