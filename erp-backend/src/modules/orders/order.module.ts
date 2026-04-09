import { Module } from '@nestjs/common';
import { OrdersService } from './order.service';
import { OrdersController } from './order.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
