import { Controller, Get, UseGuards } from '@nestjs/common';
import { SellerJwtGuard } from '../auth/guards/seller-jwt.guard';
import { CurrentSeller } from '../auth/decorators/current-seller.decorator';
import type { AuthenticatedSeller } from '../auth/interfaces/authenticated-seller.interface';
import { SellerOrdersService } from './seller-orders.service';
import { SellerOrder } from './entities/seller-order.entity';

/** Scaffolding (TS-03) — voir SellerOrdersService. */
@Controller('seller-orders')
@UseGuards(SellerJwtGuard)
export class SellerOrdersController {
  constructor(private readonly sellerOrdersService: SellerOrdersService) {}

  @Get()
  async findAll(
    @CurrentSeller() seller: AuthenticatedSeller,
  ): Promise<SellerOrder[]> {
    return this.sellerOrdersService.findAllForSeller(seller.sellerId);
  }
}
