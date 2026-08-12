import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { OrdersService } from './orders.service';
import { MarketOrder } from './entities/market-order.entity';

/** Scaffolding (TS-03) — voir OrdersService. Lecture réservée aux applications internes. */
@Controller('orders')
@UseGuards(ServiceAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<MarketOrder> {
    return this.ordersService.findById(id);
  }
}
