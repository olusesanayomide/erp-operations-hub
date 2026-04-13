import { Module } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { PurchaseContoller } from './purchase.controller';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [PurchaseContoller],
  providers: [PurchaseService],
  exports: [PurchaseService],
})
export class PurchaseModule {}
