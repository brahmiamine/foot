import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SellerJwtGuard } from '../auth/guards/seller-jwt.guard';
import { CurrentSeller } from '../auth/decorators/current-seller.decorator';
import type { AuthenticatedSeller } from '../auth/interfaces/authenticated-seller.interface';
import { InventoryService } from './inventory.service';
import { SetAvailableStockDto } from './dto/set-available-stock.dto';
import { InventoryItem } from './entities/inventory-item.entity';

/** Stock self-service vendeur (US-06). La réservation/décrément lors d'une commande reste à faire (E06). */
@Controller('inventory')
@UseGuards(SellerJwtGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async findAll(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Query('productId') productId?: string,
  ): Promise<InventoryItem[]> {
    return this.inventoryService.findAllForSeller(seller.sellerId, productId);
  }

  @Patch(':id')
  async setAvailable(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetAvailableStockDto,
  ): Promise<InventoryItem> {
    return this.inventoryService.setAvailable(
      id,
      seller.sellerId,
      dto.available,
      dto.lowStockThreshold,
    );
  }
}
