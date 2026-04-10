import { Reflector } from '@nestjs/core';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { OrdersController } from '../src/modules/orders/order.controller';
import { OrdersService } from '../src/modules/orders/order.service';
import { PurchaseContoller } from '../src/modules/purchases/purchase.controller';
import { PurchaseService } from '../src/modules/purchases/purchase.service';
import { Role } from '../src/auth/enums/role.enum';
import { ROLES_KEY } from '../src/auth/decorator/role.decorator';
import { JwtGuard } from '../src/auth/guard/jwt.guard';
import { RolesGuard } from '../src/auth/guard/role.guard';

@Injectable()
class TestJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: unknown;
    }>();
    const authorization = request.headers?.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authentication failed please provide a valid token',
      );
    }

    const roleHeader = request.headers?.['x-role'];
    const role = (roleHeader || Role.STAFF).toString().toUpperCase();
    request.user = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      email: 'test@example.com',
      roles: [role],
      isPlatformAdmin: false,
    };
    return true;
  }
}

@Injectable()
class TestRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: any }>();
    const userRoles = request.user?.roles ?? [];
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}

describe('Auth & RBAC (e2e)', () => {
  let app: INestApplication<App>;
  const ordersService = {
    getOrders: jest.fn().mockResolvedValue([]),
    getOrderById: jest.fn(),
    createOrder: jest.fn(),
    addItem: jest.fn(),
    updateStatus: jest.fn(),
  };
  const purchaseService = {
    findAll: jest.fn().mockResolvedValue([]),
    createPurchase: jest.fn(),
    recievePurchase: jest.fn(),
    getPurchaseDetails: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController, PurchaseContoller],
      providers: [
        Reflector,
        { provide: OrdersService, useValue: ordersService },
        { provide: PurchaseService, useValue: purchaseService },
      ],
    })
      .overrideGuard(JwtGuard)
      .useClass(TestJwtGuard)
      .overrideGuard(RolesGuard)
      .useClass(TestRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated access to orders', () => {
    return request(app.getHttpServer())
      .get('/orders')
      .expect(401);
  });

  it('rejects unauthenticated access to purchases', () => {
    return request(app.getHttpServer())
      .get('/purchases')
      .expect(401);
  });

  it('rejects orders access when authenticated role is insufficient', () => {
    return request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', 'Bearer test-token')
      .set('x-role', 'viewer')
      .expect(403);
  });

  it('allows orders and purchases access for staff role', async () => {
    await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', 'Bearer test-token')
      .set('x-role', Role.STAFF)
      .expect(200);

    await request(app.getHttpServer())
      .get('/purchases')
      .set('Authorization', 'Bearer test-token')
      .set('x-role', Role.STAFF)
      .expect(200);
  });
});
