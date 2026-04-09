import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { SignupTenantDto } from './dto/signup-tenant.dto';
import { Role } from './enums/role.enum';
import { UserPayload } from './decorator/get-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  assertSupabaseManagedAuth() {
    throw new GoneException(
      'Authentication is managed by Supabase. Sign in from the frontend with your Supabase credentials.',
    );
  }

  private getSupabaseAdminConfig() {
    const supabaseUrl = this.config
      .get<string>('SUPABASE_URL')
      ?.trim()
      .replace(/\/$/, '');
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new BadRequestException(
        'Supabase admin configuration is missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      );
    }

    return {
      supabaseUrl,
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
    };
  }

  private slugifyTenantName(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    if (!slug) {
      throw new BadRequestException('Unable to derive a valid tenant slug.');
    }

    return slug;
  }

  private async createSupabaseAuthUser(
    email: string,
    password: string,
    name: string,
    tenantId: string,
  ) {
    const { supabaseUrl, headers } = this.getSupabaseAdminConfig();
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, tenantId },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new BadRequestException(
        `Failed to create Supabase auth user: ${text || response.statusText}`,
      );
    }

    const result = (await response.json()) as { id: string };
    return result.id;
  }

  private async deleteSupabaseAuthUser(userId: string) {
    const { supabaseUrl, headers } = this.getSupabaseAdminConfig();
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers,
    });
  }

  async signupTenant(dto: SignupTenantDto) {
    const slug = this.slugifyTenantName(dto.slug || dto.companyName);
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingTenant) {
      throw new BadRequestException('Tenant slug is already in use.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
      select: { id: true },
    });

    if (existingUser) {
      throw new BadRequestException('A user with this email already exists.');
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.companyName.trim(),
        slug,
      },
    });

    let supabaseUserId: string | null = null;

    try {
      supabaseUserId = await this.createSupabaseAuthUser(
        dto.adminEmail,
        dto.adminPassword,
        dto.adminName,
        tenant.id,
      );

      const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);
      const user = await this.prisma.user.create({
        data: {
          id: supabaseUserId,
          tenantId: tenant.id,
          email: dto.adminEmail,
          password: hashedPassword,
          name: dto.adminName,
          roles: {
            connectOrCreate: {
              where: { name: Role.ADMIN },
              create: { name: Role.ADMIN },
            },
          },
        },
        include: {
          roles: true,
          tenant: true,
        },
      });

      return {
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          status: user.tenant.status,
        },
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles.map((role) => role.name),
          isPlatformAdmin: user.isPlatformAdmin,
        },
      };
    } catch (error) {
      if (supabaseUserId) {
        await this.deleteSupabaseAuthUser(supabaseUserId);
      }

      await this.prisma.tenant.delete({
        where: { id: tenant.id },
      });

      throw error;
    }
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true, tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Authenticated user was not found');
    }

    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        status: user.tenant.status,
      },
      roles: user.roles.map((role) => role.name),
      isPlatformAdmin: user.isPlatformAdmin,
      createdAt: user.createdAt,
    };
  }

  async listUsers(currentUser: UserPayload) {
    const users = await this.prisma.user.findMany({
      where: currentUser.isPlatformAdmin
        ? undefined
        : { tenantId: currentUser.tenantId },
      orderBy: { createdAt: 'asc' },
      include: { roles: true, tenant: true },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      roles: user.roles.map((role) => role.name),
      isPlatformAdmin: user.isPlatformAdmin,
      createdAt: user.createdAt,
    }));
  }

  async listTenants(currentUser: UserPayload) {
    if (!currentUser.isPlatformAdmin) {
      throw new ForbiddenException('Platform admin access is required.');
    }

    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
  }
}
