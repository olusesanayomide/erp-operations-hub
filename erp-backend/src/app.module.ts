import { PurchaseModule } from './modules/purchases/purchase.module';
import { Module } from '@nestjs/common';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ProductsModule } from './modules/products/product.module';
import { OrdersModule } from './modules/orders/order.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { CustomersModule } from './customers/customers.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtGuard } from './auth/guard/jwt.guard';
import { RolesGuard } from './auth/guard/role.guard';
import { ConfigModule } from '@nestjs/config';
import { TenantContextInterceptor } from './common/tenant-context.interceptor';
import { PrismaModule } from './common/prisma.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    InventoryModule,
    ProductsModule,
    OrdersModule,
    PurchaseModule,
    SuppliersModule,
    WarehousesModule,
    CustomersModule,
    AuthModule,
    SettingsModule,
    NotificationsModule,
    DashboardModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: JwtGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class AppModule {}
