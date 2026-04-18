import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    const checkedAt = new Date().toISOString();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        api: 'ok',
        database: 'ok',
        checkedAt,
      };
    } catch {
      return {
        status: 'degraded',
        api: 'ok',
        database: 'down',
        checkedAt,
        message:
          'The API is running, but the database cannot be reached right now.',
      };
    }
  }
}
