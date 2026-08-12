import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SellerJwtGuard } from '../auth/guards/seller-jwt.guard';
import { CurrentSeller } from '../auth/decorators/current-seller.decorator';
import type { AuthenticatedSeller } from '../auth/interfaces/authenticated-seller.interface';
import { SellerOrdersService } from './seller-orders.service';
import { SellerOrder } from './entities/seller-order.entity';
import { ShipSellerOrderDto } from './dto/ship-seller-order.dto';

/** Fulfillment boutique (E06/TS-20 à US-24) — voir SellerOrdersService. */
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

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSeller() seller: AuthenticatedSeller,
  ): Promise<SellerOrder> {
    return this.sellerOrdersService.findOneForSeller(id, seller.sellerId);
  }

  /** US-21 */
  @Post(':id/prepare')
  async prepare(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSeller() seller: AuthenticatedSeller,
  ): Promise<SellerOrder> {
    return this.sellerOrdersService.prepare(id, seller.sellerId);
  }

  /** US-22 */
  @Post(':id/ready-to-ship')
  async markReadyToShip(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSeller() seller: AuthenticatedSeller,
  ): Promise<SellerOrder> {
    return this.sellerOrdersService.markReadyToShip(id, seller.sellerId);
  }

  /** US-23 */
  @Post(':id/ship')
  async ship(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSeller() seller: AuthenticatedSeller,
    @Body() dto: ShipSellerOrderDto,
  ): Promise<SellerOrder> {
    return this.sellerOrdersService.ship(id, seller.sellerId, dto);
  }

  /** US-24 */
  @Post(':id/deliver')
  async markDelivered(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSeller() seller: AuthenticatedSeller,
  ): Promise<SellerOrder> {
    return this.sellerOrdersService.markDelivered(id, seller.sellerId);
  }
}
