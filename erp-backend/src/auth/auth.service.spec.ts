import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Role } from './enums/role.enum';

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
