import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../../prisma/prisma.service';
import { SignupTenantDto } from './dto/signup-tenant.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { AcceptTenantInviteDto } from './dto/accept-tenant-invite.dto';
import { CreateTenantInviteDto } from './dto/create-tenant-invite.dto';
import {
  TenantStatusValue,
  UpdateTenantStatusDto,
} from './dto/update-tenant-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { assertUnchangedSinceLoaded } from '../common/concurrency';
import { Role } from './enums/role.enum';
import { UserPayload } from './decorator/get-user.decorator';
import { MailService } from '../common/mail.service';

export const SIGNUP_EMAIL_EXISTS_MESSAGE =
  'An account already exists for this email. Please sign in or reset your password.';
const INVITE_EXPIRY_DAYS = 7;
const INVITE_STATUS_PENDING = 'PENDING';
const INVITE_STATUS_ACCEPTED = 'ACCEPTED';
const INVITE_STATUS_REVOKED = 'REVOKED';
const SETUP_SLUG_PREFIX = 'setup-';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

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
      serviceRoleKey,
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
    };
  }

  private createSupabaseServerClient() {
    const { supabaseUrl, serviceRoleKey } = this.getSupabaseAdminConfig();

    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
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

  private inferAdminNameFromEmail(email: string) {
    const localPart = email.trim().split('@')[0] || 'Owner';
    const cleaned = localPart.replace(/[._-]+/g, ' ').trim();

    if (!cleaned) {
      return 'Owner';
    }

    return cleaned
      .split(/\s+/)
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(' ');
  }

  private isOnboardingRequiredSlug(slug: string) {
    return slug.startsWith(SETUP_SLUG_PREFIX);
  }

  private async generateUniqueSetupSlug() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = `${SETUP_SLUG_PREFIX}${randomBytes(4).toString('hex')}`;
      const existingTenant = await this.prisma.tenant.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existingTenant) {
        return slug;
      }
    }

    throw new InternalServerErrorException(
      'Unable to generate a workspace identifier right now.',
    );
  }

  private isOnboardingRequiredForUser(user: {
    tenant?: { slug: string } | null;
  }) {
    return Boolean(user.tenant?.slug && this.isOnboardingRequiredSlug(user.tenant.slug));
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
      throw new BadRequestException(
        'Unable to create authentication account right now.',
      );
    }

    const result = (await response.json()) as { id: string };
    return result.id;
  }

  private async signupSupabaseAuthUser(
    email: string,
    password: string,
    name: string,
    tenantId: string,
  ) {
    const supabase = this.createSupabaseServerClient();
    const signupRedirectTo = `${this.getFrontendBaseUrl()}/dashboard`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, tenantId },
        emailRedirectTo: signupRedirectTo,
      },
    });

    if (error || !data.user?.id) {
      throw new BadRequestException(
        error?.message || 'Unable to create authentication account right now.',
      );
    }

    return data.user.id;
  }

  private async getSupabaseAuthUser(userId: string) {
    const { supabaseUrl, headers } = this.getSupabaseAdminConfig();
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new BadRequestException(
        'Unable to verify the authentication account for this signup.',
      );
    }

    return (await response.json()) as { id: string; email?: string | null };
  }

  private async deleteSupabaseAuthUser(userId: string) {
    const { supabaseUrl, headers } = this.getSupabaseAdminConfig();
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers,
    });
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private createInviteToken() {
    return randomBytes(32).toString('base64url');
  }

  private hashInviteToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private getFrontendBaseUrl() {
    const configuredUrl =
      this.config.get<string>('FRONTEND_SITE_URL') ||
      this.config.get<string>('SITE_URL') ||
      this.config.get<string>('PUBLIC_APP_URL') ||
      this.config.get<string>('CORS_ORIGINS')?.split(',')[0];

    if (configuredUrl) {
      return configuredUrl.trim().replace(/\/$/, '');
    }

    if ((this.config.get<string>('NODE_ENV') ?? 'development') === 'production') {
      throw new InternalServerErrorException(
        'FRONTEND_SITE_URL must be configured in production to generate invite links.',
      );
    }

    return 'http://localhost:8080';
  }

  private createInviteLink(token: string) {
    return `${this.getFrontendBaseUrl()}/join/${encodeURIComponent(token)}`;
  }

  private createLoginLink() {
    return `${this.getFrontendBaseUrl()}/login`;
  }

  private async sendWelcomeEmailSafely(payload: {
    email: string;
    name?: string | null;
    tenantName: string;
  }) {
    try {
      await this.mailService.sendWelcomeEmail({
        ...payload,
        loginLink: this.createLoginLink(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Welcome email could not be sent to ${payload.email}: ${message}`);
    }
  }

  private assertTenantAdmin(user: UserPayload) {
    if (!user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('Admin access is required.');
    }
  }

  private assertInviteCanBeAccepted(invite: {
    status: string;
    expiresAt: Date;
  }) {
    if (invite.status === INVITE_STATUS_ACCEPTED) {
      throw new BadRequestException('This invite has already been accepted.');
    }

    if (invite.status === INVITE_STATUS_REVOKED) {
      throw new BadRequestException('This invite has been revoked.');
    }

    if (invite.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('This invite has expired.');
    }
  }

  private serializeInvite(invite: {
    id: string;
    email: string;
    name?: string | null;
    role: string;
    status: string;
    expiresAt: Date;
    createdAt: Date;
  }) {
    return {
      id: invite.id,
      email: invite.email,
      name: invite.name,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    };
  }

  async createTenantInvite(user: UserPayload, dto: CreateTenantInviteDto) {
    this.assertTenantAdmin(user);

    const email = this.normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new BadRequestException(
        'A user with this email already exists. Ask them to sign in instead.',
      );
    }

    const existingPendingInvite = await this.prisma.tenantInvite.findFirst({
      where: {
        tenantId: user.tenantId,
        email,
        status: INVITE_STATUS_PENDING,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (existingPendingInvite) {
      throw new BadRequestException(
        'A pending invite already exists for this email.',
      );
    }

    const token = this.createInviteToken();
    const tokenHash = this.hashInviteToken(token);
    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    const invite = await this.prisma.tenantInvite.create({
      data: {
        tenantId: user.tenantId,
        email,
        name: dto.name?.trim() || null,
        role: dto.role,
        tokenHash,
        expiresAt,
        createdByUserId: user.userId,
      },
    });

    const inviteLink = this.createInviteLink(token);
    let emailDelivery: 'sent' | 'failed' = 'sent';

    try {
      const delivered = await this.mailService.sendInviteEmail({
        email: invite.email,
        name: invite.name,
        tenantName: user.tenant?.name || 'your workspace',
        role: invite.role,
        inviteLink,
        expiresAt: invite.expiresAt,
      });
      emailDelivery = delivered ? 'sent' : 'failed';
    } catch (error) {
      emailDelivery = 'failed';
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Invite email could not be sent to ${invite.email}: ${message}`);
    }

    return {
      ...this.serializeInvite(invite),
      inviteLink,
      emailDelivery,
    };
  }

  async listTenantInvites(user: UserPayload) {
    this.assertTenantAdmin(user);

    const invites = await this.prisma.tenantInvite.findMany({
      where: {
        tenantId: user.tenantId,
        status: INVITE_STATUS_PENDING,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invites.map((invite) => this.serializeInvite(invite));
  }

  async revokeTenantInvite(user: UserPayload, inviteId: string) {
    this.assertTenantAdmin(user);

    const invite = await this.prisma.tenantInvite.findFirst({
      where: {
        id: inviteId,
        tenantId: user.tenantId,
        status: INVITE_STATUS_PENDING,
      },
    });

    if (!invite) {
      throw new BadRequestException('Pending invite was not found.');
    }

    const revokedInvite = await this.prisma.tenantInvite.update({
      where: { id: invite.id },
      data: {
        status: INVITE_STATUS_REVOKED,
        revokedAt: new Date(),
      },
    });

    return this.serializeInvite(revokedInvite);
  }

  async getTenantInvite(token: string) {
    const invite = await this.prisma.tenantInvite.findUnique({
      where: { tokenHash: this.hashInviteToken(token) },
      include: { tenant: true },
    });

    if (!invite) {
      throw new BadRequestException('Invite link is invalid.');
    }

    this.assertInviteCanBeAccepted(invite);

    return {
      tenantName: invite.tenant.name,
      email: invite.email,
      name: invite.name,
      role: invite.role,
      expiresAt: invite.expiresAt,
    };
  }

  async acceptTenantInvite(token: string, dto: AcceptTenantInviteDto) {
    const invite = await this.prisma.tenantInvite.findUnique({
      where: { tokenHash: this.hashInviteToken(token) },
      include: { tenant: true },
    });

    if (!invite) {
      throw new BadRequestException('Invite link is invalid.');
    }

    this.assertInviteCanBeAccepted(invite);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: invite.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new BadRequestException(
        'A user with this email already exists. Please sign in instead.',
      );
    }

    const name = dto.name.trim();
    let supabaseUserId: string | null = null;

    try {
      supabaseUserId = await this.createSupabaseAuthUser(
        invite.email,
        dto.password,
        name,
        invite.tenantId,
      );

      const user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            id: supabaseUserId as string,
            tenantId: invite.tenantId,
            email: invite.email,
            name,
            roles: {
              connectOrCreate: {
                where: { name: invite.role },
                create: { name: invite.role },
              },
            },
          },
          include: {
            roles: true,
            tenant: true,
          },
        });

        await tx.tenantInvite.update({
          where: { id: invite.id },
          data: {
            status: INVITE_STATUS_ACCEPTED,
            acceptedAt: new Date(),
          },
        });

        return createdUser;
      });

      await this.sendWelcomeEmailSafely({
        email: user.email,
        name: user.name,
        tenantName: user.tenant.name,
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

      throw error;
    }
  }

  async signupTenant(dto: SignupTenantDto) {
    const normalizedEmail = dto.adminEmail.trim().toLowerCase();
    const inferredAdminName = this.inferAdminNameFromEmail(normalizedEmail);
    const adminName = dto.adminName?.trim() || inferredAdminName;
    const trimmedCompanyName = dto.companyName?.trim();
    const hasWorkspaceSetupData = Boolean(trimmedCompanyName);
    const companyName = hasWorkspaceSetupData
      ? trimmedCompanyName as string
      : `${adminName}'s Workspace`;
    const slug = hasWorkspaceSetupData
      ? this.slugifyTenantName(dto.slug || companyName)
      : await this.generateUniqueSetupSlug();

    if (hasWorkspaceSetupData) {
      const existingTenant = await this.prisma.tenant.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (existingTenant) {
        throw new BadRequestException('Tenant slug is already in use.');
      }
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      throw new BadRequestException(SIGNUP_EMAIL_EXISTS_MESSAGE);
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: companyName,
        slug,
      },
    });

    let supabaseUserId: string | null = null;

    try {
      if (dto.authUserId) {
        const authUser = await this.getSupabaseAuthUser(dto.authUserId);

        if (this.normalizeEmail(authUser.email || '') !== normalizedEmail) {
          throw new BadRequestException(
            'The verification email must be completed with the same account used to start signup.',
          );
        }

        supabaseUserId = authUser.id;
      } else {
        supabaseUserId = await this.signupSupabaseAuthUser(
          normalizedEmail,
          dto.adminPassword,
          adminName,
          tenant.id,
        );
      }

      const user = await this.prisma.user.create({
        data: {
          id: supabaseUserId,
          tenantId: tenant.id,
          email: normalizedEmail,
          name: adminName,
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

      await this.sendWelcomeEmailSafely({
        email: user.email,
        name: user.name,
        tenantName: user.tenant.name,
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

  serializeCurrentUser(user: UserPayload) {
    if (!user.tenant) {
      throw new UnauthorizedException(
        'Authenticated user tenant context is missing',
      );
    }

    return {
      sub: user.userId,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      tenant: user.tenant,
      roles: user.roles,
      isPlatformAdmin: user.isPlatformAdmin,
      onboardingRequired: user.onboardingRequired ?? false,
      createdAt: user.createdAt,
    };
  }

  async completeOnboarding(user: UserPayload, dto: CompleteOnboardingDto) {
    const companyName = dto.companyName.trim();
    const adminName = dto.adminName?.trim() || user.name?.trim() || this.inferAdminNameFromEmail(user.email);
    const slug = this.slugifyTenantName(dto.slug || companyName);

    const existingTenant = await this.prisma.tenant.findFirst({
      where: {
        slug,
        NOT: { id: user.tenantId },
      },
      select: { id: true },
    });

    if (existingTenant) {
      throw new BadRequestException('Tenant slug is already in use.');
    }

    await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: user.tenantId },
        data: {
          name: companyName,
          slug,
        },
      }),
      this.prisma.user.update({
        where: { id: user.userId },
        data: {
          name: adminName,
        },
      }),
    ]);

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        roles: true,
        tenant: true,
      },
    });

    if (!updatedUser) {
      throw new UnauthorizedException('Authenticated user was not found');
    }

    return {
      sub: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      tenantId: updatedUser.tenantId,
      tenant: {
        id: updatedUser.tenant.id,
        name: updatedUser.tenant.name,
        slug: updatedUser.tenant.slug,
        status: updatedUser.tenant.status,
      },
      roles: updatedUser.roles.map((role) => role.name),
      isPlatformAdmin: updatedUser.isPlatformAdmin,
      onboardingRequired: this.isOnboardingRequiredForUser(updatedUser),
      createdAt: updatedUser.createdAt,
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
      updatedAt: user.updatedAt,
    }));
  }

  async updateUser(
    currentUser: UserPayload,
    userId: string,
    dto: UpdateUserDto,
  ) {
    const targetUser = await this.prisma.user.findFirst({
      where: currentUser.isPlatformAdmin
        ? { id: userId }
        : { id: userId, tenantId: currentUser.tenantId },
      include: { roles: true, tenant: true },
    });

    if (!targetUser) {
      throw new BadRequestException('User not found.');
    }

    assertUnchangedSinceLoaded(targetUser.updatedAt, dto.expectedUpdatedAt);

    if (!dto.name && !dto.role) {
      throw new BadRequestException('Provide at least one field to update.');
    }

    const currentRole = targetUser.roles[0]?.name as Role | undefined;

    if (dto.role && currentUser.userId === userId && dto.role !== currentRole) {
      throw new BadRequestException(
        'You cannot change your own role from the current session.',
      );
    }

    if (dto.role && dto.role !== currentRole && currentRole === Role.ADMIN) {
      const tenantAdminCount = await this.prisma.user.count({
        where: {
          tenantId: targetUser.tenantId,
          roles: {
            some: { name: Role.ADMIN },
          },
        },
      });

      if (tenantAdminCount <= 1) {
        throw new BadRequestException(
          'Each tenant must keep at least one admin user.',
        );
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUser.id },
      data: {
        name: dto.name === undefined ? undefined : dto.name.trim() || null,
        roles: dto.role
          ? {
              set: [],
              connect: [{ name: dto.role }],
            }
          : undefined,
      },
      include: { roles: true, tenant: true },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      tenantId: updatedUser.tenantId,
      tenantName: updatedUser.tenant.name,
      roles: updatedUser.roles.map((role) => role.name),
      isPlatformAdmin: updatedUser.isPlatformAdmin,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async listTenants(currentUser: UserPayload) {
    if (!currentUser.isPlatformAdmin) {
      throw new ForbiddenException('Platform admin access is required.');
    }

    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      userCount: tenant._count.users,
    }));
  }

  async updateTenantStatus(
    currentUser: UserPayload,
    tenantId: string,
    dto: UpdateTenantStatusDto,
  ) {
    if (!currentUser.isPlatformAdmin) {
      throw new ForbiddenException('Platform admin access is required.');
    }

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { users: true },
        },
      },
    });

    if (!existingTenant) {
      throw new BadRequestException('Tenant was not found.');
    }

    assertUnchangedSinceLoaded(existingTenant.updatedAt, dto.expectedUpdatedAt);

    const existingTenantStatus = existingTenant.status as TenantStatusValue;

    if (existingTenantStatus === dto.status) {
      return {
        id: existingTenant.id,
        name: existingTenant.name,
        slug: existingTenant.slug,
        status: existingTenant.status,
        createdAt: existingTenant.createdAt,
        updatedAt: existingTenant.updatedAt,
        userCount: existingTenant._count.users,
      };
    }

    if (
      existingTenantStatus === TenantStatusValue.ARCHIVED &&
      dto.status === TenantStatusValue.SUSPENDED
    ) {
      throw new BadRequestException(
        'Archived tenants can only be reactivated or remain archived.',
      );
    }

    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: dto.status },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      userCount: tenant._count.users,
    };
  }
}
