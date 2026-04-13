import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { TenantContextService } from '../src/common/tenant-context.service';

const TENANT_SCOPED_MODELS = new Set([
  'User',
  'Warehouse',
  'Product',
  'InventoryItem',
  'StockMovement',
  'Order',
  'Customer',
  'Supplier',
  'Purchase',
  'Notification',
  'UserNotification',
]);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly tenantContext: TenantContextService) {
    super();

    this.$use(async (params, next) => {
      const tenantId = this.tenantContext.getTenantId();
      const isPlatformAdmin = this.tenantContext.isPlatformAdmin();

      if (!tenantId || isPlatformAdmin || !params.model) {
        return next(params);
      }

      if (!TENANT_SCOPED_MODELS.has(params.model)) {
        return next(params);
      }

      const tenantFilter = { tenantId };

      switch (params.action) {
        case 'findMany':
        case 'findFirst':
        case 'count':
        case 'aggregate':
        case 'updateMany':
        case 'deleteMany':
          params.args = params.args ?? {};
          params.args.where = this.mergeWhere(params.args.where, tenantFilter);
          break;

        case 'findUnique':
          params.action = 'findFirst';
          params.args = params.args ?? {};
          params.args.where = this.mergeWhere(params.args.where, tenantFilter);
          break;

        case 'create':
          params.args = params.args ?? {};
          params.args.data = this.enforceTenantOnCreate(params.args.data, tenantId);
          break;

        case 'createMany':
          params.args = params.args ?? {};
          params.args.data = Array.isArray(params.args.data)
            ? params.args.data.map((item: unknown) =>
                this.enforceTenantOnCreate(item, tenantId),
              )
            : this.enforceTenantOnCreate(params.args.data, tenantId);
          break;

        case 'upsert':
          params.args = params.args ?? {};
          params.args.where = this.mergeWhere(params.args.where, tenantFilter);
          params.args.create = this.enforceTenantOnCreate(
            params.args.create,
            tenantId,
          );
          params.args.update = this.assertTenantNotChanged(
            params.args.update,
            tenantId,
          );
          break;

        case 'update':
        case 'delete':
          params.args = params.args ?? {};
          await this.assertTenantOwnership(params.model, params.args.where, tenantId);
          if (params.action === 'update') {
            params.args.data = this.assertTenantNotChanged(
              params.args.data,
              tenantId,
            );
          }
          break;

        default:
          break;
      }

      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private mergeWhere(existingWhere: unknown, tenantFilter: { tenantId: string }) {
    if (!existingWhere) {
      return tenantFilter;
    }

    return {
      AND: [existingWhere, tenantFilter],
    };
  }

  private enforceTenantOnCreate(data: unknown, tenantId: string) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return data;
    }

    const record = data as Record<string, unknown>;
    if (
      typeof record.tenantId === 'string' &&
      record.tenantId.length > 0 &&
      record.tenantId !== tenantId
    ) {
      throw new ForbiddenException('Cross-tenant writes are not allowed.');
    }

    return {
      ...record,
      tenantId,
    };
  }

  private assertTenantNotChanged(data: unknown, tenantId: string) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return data;
    }

    const record = data as Record<string, unknown>;
    if (
      typeof record.tenantId === 'string' &&
      record.tenantId.length > 0 &&
      record.tenantId !== tenantId
    ) {
      throw new ForbiddenException('Cross-tenant writes are not allowed.');
    }

    return {
      ...record,
      tenantId,
    };
  }

  private async assertTenantOwnership(
    model: string,
    where: Prisma.InputJsonValue | Prisma.InputJsonObject | undefined,
    tenantId: string,
  ) {
    const delegate = (this as unknown as Record<string, any>)[
      model.charAt(0).toLowerCase() + model.slice(1)
    ];

    if (!delegate?.findFirst) {
      return;
    }

    const ownedRecord = await delegate.findFirst({
      where: this.mergeWhere(where, { tenantId }),
      select: { id: true },
    });

    if (!ownedRecord) {
      throw new NotFoundException(
        `${model} record was not found in the current tenant scope.`,
      );
    }
  }
}
