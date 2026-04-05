import { Module } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { PurchaseContoller } from './purchase.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  imports: [],
  controllers: [PurchaseContoller],
  providers: [PurchaseService, PrismaService],
  exports: [PurchaseService],
})
export class PurchaseModule {}
