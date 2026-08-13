import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { StockReservation } from './entities/stock-reservation.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryHealthController } from './inventory-health.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryItem, StockReservation]),
    NotificationsModule,
  ],
  controllers: [InventoryController, InventoryHealthController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
