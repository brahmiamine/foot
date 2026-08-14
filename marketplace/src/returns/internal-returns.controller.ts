import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { ReturnsService } from './returns.service';
import { RequestReturnDto } from './dto/request-return.dto';
import { ReturnRequest } from './entities/return-request.entity';

/**
 * US-50 — demande de retour initiée par le client. Aucune app de ce dépôt
 * n'authentifie encore un acheteur marketplace (pas de tunnel d'achat
 * réel, voir avancement.md Epic E05/E06) : cet endpoint suit donc le même
 * pattern que `internal/products` (TS-04) — service-à-service, l'identité
 * de l'acheteur (`customerName`) passée explicitement par l'app appelante
 * plutôt que dérivée d'un JWT acheteur qui n'existe pas encore.
 */
@Controller('internal/returns')
@UseGuards(ServiceAuthGuard)
export class InternalReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  async request(@Body() dto: RequestReturnDto): Promise<ReturnRequest> {
    return this.returnsService.request(dto);
  }
}
