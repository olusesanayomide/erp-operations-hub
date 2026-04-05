import { Module } from '@nestjs/common';
import { OrdersService } from './order.service';
import { OrdersController } from './order.controller';
import { PrismaService } from 'prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

@Module({
  imports: [],
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService, InventoryService],
  exports: [OrdersService],
})
export class OrdersModule {}
