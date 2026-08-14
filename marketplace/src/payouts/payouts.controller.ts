import { Controller, Get, UseGuards } from '@nestjs/common';
import { SellerJwtGuard } from '../auth/guards/seller-jwt.guard';
import { CurrentSeller } from '../auth/decorators/current-seller.decorator';
import type { AuthenticatedSeller } from '../auth/interfaces/authenticated-seller.interface';
import { PayoutsService } from './payouts.service';
import { Payout } from './entities/payout.entity';

/** E15 — lecture seule côté vendeur (déclaratif). Déclenchement et transitions : voir InternalPayoutsController. */
@Controller('payouts')
@UseGuards(SellerJwtGuard)
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get()
  async findAll(
    @CurrentSeller() seller: AuthenticatedSeller,
  ): Promise<Payout[]> {
    return this.payoutsService.findAllForSeller(seller.sellerId);
  }
}
