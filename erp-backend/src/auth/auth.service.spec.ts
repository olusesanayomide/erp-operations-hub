import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthService, SIGNUP_EMAIL_EXISTS_MESSAGE } from './auth.service';
import { Role } from './enums/role.enum';

const adminUser = {
  userId: 'admin-1',
  tenantId: 'tenant-1',
  email: 'admin@example.com',
  roles: [Role.ADMIN],
  isPlatformAdmin: false,
};

const staffUser = {
  userId: 'staff-1',
  tenantId: 'tenant-1',
  email: 'staff@example.com',
  roles: [Role.STAFF],
  isPlatformAdmin: false,
};

function createAuthPrismaMock() {
  return {
    tenant: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    tenantInvite: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    count: jest.fn(),
    $transaction: jest.fn(),
  };
}

function createConfigMock() {
  return {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        SUPABASE_URL: 'https://supabase.example',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        FRONTEND_SITE_URL: 'https://erp.example',
      };
      return values[key];
    }),
  };
}

describe('AuthService tenant invites', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createAuthPrismaMock>;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    prisma = createAuthPrismaMock();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    service = new AuthService(prisma as any, createConfigMock() as any);
  });

  it('creates an invite scoped to the admin tenant', async () => {
    const expiresAt = new Date('2026-04-30T00:00:00.000Z');
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.tenantInvite.findFirst.mockResolvedValue(null);
    prisma.tenantInvite.create.mockResolvedValue({
      id: 'invite-1',
      email: 'staff@example.com',
      name: 'Staff User',
      role: Role.STAFF,
      status: 'PENDING',
      expiresAt,
      createdAt: new Date('2026-04-23T00:00:00.000Z'),
    });

    const result = await service.createTenantInvite(adminUser, {
      email: ' STAFF@example.com ',
      name: 'Staff User',
      role: Role.STAFF,
    });

    expect(prisma.tenantInvite.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        email: 'staff@example.com',
        name: 'Staff User',
        role: Role.STAFF,
        createdByUserId: 'admin-1',
      }),
    });
    expect(result.inviteLink).toMatch(/^https:\/\/erp\.example\/join\//);
  });

  it('blocks non-admin users from creating invites', async () => {
    await expect(
      service.createTenantInvite(staffUser, {
        email: 'new@example.com',
        role: Role.STAFF,
      }),
    ).rejects.toThrow(new ForbiddenException('Admin access is required.'));

    expect(prisma.tenantInvite.create).not.toHaveBeenCalled();
  });

  it('does not invite an email that already belongs to a user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

    await expect(
      service.createTenantInvite(adminUser, {
        email: 'existing@example.com',
        role: Role.STAFF,
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'A user with this email already exists. Ask them to sign in instead.',
      ),
    );

    expect(prisma.tenantInvite.create).not.toHaveBeenCalled();
  });

  it('rejects expired, revoked, and accepted invites', async () => {
    const cases = [
      {
        invite: {
          status: 'PENDING',
          expiresAt: new Date('2020-01-01T00:00:00.000Z'),
        },
        message: 'This invite has expired.',
      },
      {
        invite: {
          status: 'REVOKED',
          expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        },
        message: 'This invite has been revoked.',
      },
      {
        invite: {
          status: 'ACCEPTED',
          expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        },
        message: 'This invite has already been accepted.',
      },
    ];

    for (const testCase of cases) {
      prisma.tenantInvite.findUnique.mockResolvedValueOnce({
        id: 'invite-1',
        email: 'staff@example.com',
        role: Role.STAFF,
        tenantId: 'tenant-1',
        tenant: { name: 'Tenant One' },
        ...testCase.invite,
      });

      await expect(
        service.acceptTenantInvite('token', {
          name: 'Staff User',
          password: 'StrongPassword123!',
        }),
      ).rejects.toThrow(new BadRequestException(testCase.message));
    }
  });

  it('accepts an invite by creating the Supabase and ERP users', async () => {
    const invite = {
      id: 'invite-1',
      tenantId: 'tenant-1',
      email: 'staff@example.com',
      role: Role.MANAGER,
      status: 'PENDING',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      tenant: {
        id: 'tenant-1',
        name: 'Tenant One',
        slug: 'tenant-one',
        status: 'ACTIVE',
      },
    };
    prisma.tenantInvite.findUnique.mockResolvedValue(invite);
    prisma.user.findUnique.mockResolvedValue(null);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'supabase-user-1' }),
    });
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        user: {
          create: jest.fn().mockResolvedValue({
            id: 'supabase-user-1',
            email: 'staff@example.com',
            name: 'Staff User',
            isPlatformAdmin: false,
            roles: [{ name: Role.MANAGER }],
            tenant: invite.tenant,
          }),
        },
        tenantInvite: {
          update: jest.fn().mockResolvedValue(null),
        },
      }),
    );

    const result = await service.acceptTenantInvite('token', {
      name: 'Staff User',
      password: 'StrongPassword123!',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://supabase.example/auth/v1/admin/users',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.user).toEqual(
      expect.objectContaining({
        id: 'supabase-user-1',
        email: 'staff@example.com',
        roles: [Role.MANAGER],
      }),
    );
  });

  it('rolls back Supabase user creation when ERP user creation fails', async () => {
    prisma.tenantInvite.findUnique.mockResolvedValue({
      id: 'invite-1',
      tenantId: 'tenant-1',
      email: 'staff@example.com',
      role: Role.STAFF,
      status: 'PENDING',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      tenant: { name: 'Tenant One' },
    });
    prisma.user.findUnique.mockResolvedValue(null);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'supabase-user-1' }),
      })
      .mockResolvedValueOnce({ ok: true });
    prisma.$transaction.mockRejectedValue(new Error('database failed'));

    await expect(
      service.acceptTenantInvite('token', {
        name: 'Staff User',
        password: 'StrongPassword123!',
      }),
    ).rejects.toThrow('database failed');

    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://supabase.example/auth/v1/admin/users/supabase-user-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('does not revoke another tenant invite', async () => {
    prisma.tenantInvite.findFirst.mockResolvedValue(null);

    await expect(
      service.revokeTenantInvite(adminUser, 'invite-other-tenant'),
    ).rejects.toThrow(new BadRequestException('Pending invite was not found.'));

    expect(prisma.tenantInvite.update).not.toHaveBeenCalled();
  });
});

describe('AuthService.signupTenant', () => {
  let service: AuthService;
  let prisma: {
    tenant: { findUnique: jest.Mock; create: jest.Mock; delete: jest.Mock };
    user: { findUnique: jest.Mock; create: jest.Mock };
  };
  let fetchMock: jest.Mock;

  beforeEach(() => {
    prisma = {
      tenant: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    service = new AuthService(prisma as any, {} as any);
  });

  it('rejects an existing tenant slug before creating records or Supabase users', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });

    await expect(
      service.signupTenant({
        companyName: 'Acme Incorporated',
        slug: 'acme-incorporated',
        adminName: 'Jane Founder',
        adminEmail: 'jane@example.com',
        adminPassword: 'StrongPassword123!',
      }),
    ).rejects.toThrow(
      new BadRequestException('Tenant slug is already in use.'),
    );

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.tenant.create).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an existing admin email before creating a tenant or Supabase user', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

    await expect(
      service.signupTenant({
        companyName: 'Acme Incorporated',
        slug: 'acme-incorporated',
        adminName: 'Jane Founder',
        adminEmail: 'jane@example.com',
        adminPassword: 'StrongPassword123!',
      }),
    ).rejects.toThrow(new BadRequestException(SIGNUP_EMAIL_EXISTS_MESSAGE));

    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { slug: 'acme-incorporated' },
      select: { id: true },
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'jane@example.com' },
      select: { id: true },
    });
    expect(prisma.tenant.create).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('AuthService.updateUser', () => {
  let service: AuthService;
  let prisma: {
    user: { findFirst: jest.Mock; update: jest.Mock };
    count: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      count: jest.fn(),
    };

    (prisma as any).user.count = prisma.count;

    service = new AuthService(prisma as any, {} as any);
  });

  it('updates a user name and role for the same tenant', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-2',
      tenantId: 'tenant-1',
      name: 'Alex',
      email: 'alex@example.com',
      isPlatformAdmin: false,
      createdAt: new Date('2026-04-11'),
      roles: [{ name: Role.STAFF }],
      tenant: { name: 'Tenant One' },
    });
    prisma.user.update.mockResolvedValue({
      id: 'user-2',
      tenantId: 'tenant-1',
      name: 'Alex Johnson',
      email: 'alex@example.com',
      isPlatformAdmin: false,
      createdAt: new Date('2026-04-11'),
      roles: [{ name: Role.MANAGER }],
      tenant: { name: 'Tenant One' },
    });

    const result = await service.updateUser(
      {
        userId: 'admin-1',
        tenantId: 'tenant-1',
        email: 'admin@example.com',
        roles: [Role.ADMIN],
        isPlatformAdmin: false,
      },
      'user-2',
      {
        name: 'Alex Johnson',
        role: Role.MANAGER,
      },
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: {
        name: 'Alex Johnson',
        roles: {
          set: [],
          connect: [{ name: Role.MANAGER }],
        },
      },
      include: { roles: true, tenant: true },
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'user-2',
        name: 'Alex Johnson',
        roles: [Role.MANAGER],
      }),
    );
  });

  it('blocks changing your own role from the current session', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'admin-1',
      tenantId: 'tenant-1',
      name: 'Admin',
      email: 'admin@example.com',
      isPlatformAdmin: false,
      createdAt: new Date('2026-04-11'),
      roles: [{ name: Role.ADMIN }],
      tenant: { name: 'Tenant One' },
    });

    await expect(
      service.updateUser(
        {
          userId: 'admin-1',
          tenantId: 'tenant-1',
          email: 'admin@example.com',
          roles: [Role.ADMIN],
          isPlatformAdmin: false,
        },
        'admin-1',
        { role: Role.MANAGER },
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'You cannot change your own role from the current session.',
      ),
    );

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('blocks demoting the last admin in a tenant', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'admin-2',
      tenantId: 'tenant-1',
      name: 'Only Admin',
      email: 'only-admin@example.com',
      isPlatformAdmin: false,
      createdAt: new Date('2026-04-11'),
      roles: [{ name: Role.ADMIN }],
      tenant: { name: 'Tenant One' },
    });
    prisma.count.mockResolvedValue(1);

    await expect(
      service.updateUser(
        {
          userId: 'admin-1',
          tenantId: 'tenant-1',
          email: 'admin@example.com',
          roles: [Role.ADMIN],
          isPlatformAdmin: false,
        },
        'admin-2',
        { role: Role.STAFF },
      ),
    ).rejects.toThrow(
      new BadRequestException('Each tenant must keep at least one admin user.'),
    );

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
