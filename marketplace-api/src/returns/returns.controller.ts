import { Controller, Get, UseGuards } from '@nestjs/common';
import { SellerJwtGuard } from '../auth/guards/seller-jwt.guard';
import { CurrentSeller } from '../auth/decorators/current-seller.decorator';
import type { AuthenticatedSeller } from '../auth/interfaces/authenticated-seller.interface';
import { ReturnsService } from './returns.service';
import { ReturnRequest } from './entities/return-request.entity';

/** Scaffolding (TS-03) — voir ReturnsService. */
@Controller('returns')
@UseGuards(SellerJwtGuard)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  async findAll(
    @CurrentSeller() seller: AuthenticatedSeller,
  ): Promise<ReturnRequest[]> {
    return this.returnsService.findAllForSeller(seller.sellerId);
  }
}
