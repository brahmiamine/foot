import {
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
import { ReturnsService } from './returns.service';
import { ReturnRequest } from './entities/return-request.entity';

/** E16 (US-51/US-52) — décision et complétion du retour côté vendeur. */
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

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSeller() seller: AuthenticatedSeller,
  ): Promise<ReturnRequest> {
    return this.returnsService.findOneForSeller(id, seller.sellerId);
  }

  /** US-51 — REQUESTED -> APPROVED */
  @Post(':id/approve')
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSeller() seller: AuthenticatedSeller,
  ): Promise<ReturnRequest> {
    return this.returnsService.decide(id, seller.sellerId, true);
  }

  /** US-51 — REQUESTED -> REJECTED (la commande redevient DELIVERED) */
  @Post(':id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSeller() seller: AuthenticatedSeller,
  ): Promise<ReturnRequest> {
    return this.returnsService.decide(id, seller.sellerId, false);
  }

  /**
   * US-52 — APPROVED -> COMPLETED (article physiquement reçu en retour),
   * déclenche automatiquement une demande de remboursement (TASK-P0-006).
   */
  @Post(':id/complete')
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSeller() seller: AuthenticatedSeller,
  ): Promise<ReturnRequest> {
    return this.returnsService.complete(id, seller.sellerId);
  }

  /** TASK-P0-006 — REFUND_FAILED -> rejeu de la demande de remboursement. */
  @Post(':id/retry-refund')
  async retryRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSeller() seller: AuthenticatedSeller,
  ): Promise<ReturnRequest> {
    return this.returnsService.retryRefund(id, seller.sellerId);
  }
}
