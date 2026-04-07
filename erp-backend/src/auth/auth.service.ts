import { GoneException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  assertSupabaseManagedAuth() {
    throw new GoneException(
      'Authentication is managed by Supabase. Sign in from the frontend with your Supabase credentials.',
    );
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user) {
      throw new UnauthorizedException('Authenticated user was not found');
    }

    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles.map((role) => role.name),
      createdAt: user.createdAt,
    };
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      include: { roles: true },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles.map((role) => role.name),
      createdAt: user.createdAt,
    }));
  }
}
