import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryItem]), NotificationsModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
