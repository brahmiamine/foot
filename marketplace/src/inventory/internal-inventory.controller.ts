import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { AllowedApplicationsGuard } from '../auth/guards/allowed-applications.guard';
import { AllowedApplications } from '../auth/decorators/allowed-applications.decorator';
import { InventoryService } from './inventory.service';
import { SetAvailableStockDto } from './dto/set-available-stock.dto';
import { InventoryItem } from './entities/inventory-item.entity';

@Controller('internal/inventory')
@UseGuards(ServiceAuthGuard, AllowedApplicationsGuard)
@AllowedApplications('seller-portal')
export class InternalInventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Patch(':id')
  setAvailable(
    @Query('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetAvailableStockDto,
  ): Promise<InventoryItem> {
    return this.inventoryService.setAvailable(id, sellerId, dto.available, dto.lowStockThreshold);
  }
}
