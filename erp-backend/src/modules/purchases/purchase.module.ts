import { Module } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { PurchaseContoller } from './purchase.controller';

@Module({
  imports: [],
  controllers: [PurchaseContoller],
  providers: [PurchaseService],
  exports: [PurchaseService],
})
export class PurchaseModule {}
