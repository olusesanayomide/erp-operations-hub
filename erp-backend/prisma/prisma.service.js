"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const tenant_context_service_1 = require("../src/common/tenant-context.service");
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
let PrismaService = class PrismaService extends client_1.PrismaClient {
    tenantContext;
    constructor(tenantContext) {
        super();
        this.tenantContext = tenantContext;
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
                        ? params.args.data.map((item) => this.enforceTenantOnCreate(item, tenantId))
                        : this.enforceTenantOnCreate(params.args.data, tenantId);
                    break;
                case 'upsert':
                    params.args = params.args ?? {};
                    params.args.create = this.enforceTenantOnCreate(params.args.create, tenantId);
                    params.args.update = this.assertTenantNotChanged(params.args.update, tenantId);
                    break;
                case 'update':
                case 'delete':
                    params.args = params.args ?? {};
                    await this.assertTenantOwnership(params.model, params.args.where, tenantId);
                    if (params.action === 'update') {
                        params.args.data = this.assertTenantNotChanged(params.args.data, tenantId);
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
    mergeWhere(existingWhere, tenantFilter) {
        if (!existingWhere) {
            return tenantFilter;
        }
        return {
            AND: [existingWhere, tenantFilter],
        };
    }
    enforceTenantOnCreate(data, tenantId) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return data;
        }
        const record = data;
        if (typeof record.tenantId === 'string' &&
            record.tenantId.length > 0 &&
            record.tenantId !== tenantId) {
            throw new common_1.ForbiddenException('Cross-tenant writes are not allowed.');
        }
        return {
            ...record,
            tenantId,
        };
    }
    assertTenantNotChanged(data, tenantId) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return data;
        }
        const record = data;
        if (typeof record.tenantId === 'string' &&
            record.tenantId.length > 0 &&
            record.tenantId !== tenantId) {
            throw new common_1.ForbiddenException('Cross-tenant writes are not allowed.');
        }
        return {
            ...record,
            tenantId,
        };
    }
    async assertTenantOwnership(model, where, tenantId) {
        const delegate = this[model.charAt(0).toLowerCase() + model.slice(1)];
        if (!delegate?.findFirst) {
            return;
        }
        const ownedRecord = await delegate.findFirst({
            where: this.mergeWhere(where, { tenantId }),
            select: { id: true },
        });
        if (!ownedRecord) {
            throw new common_1.NotFoundException(`${model} record was not found in the current tenant scope.`);
        }
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_context_service_1.TenantContextService])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map