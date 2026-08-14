import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DeliveriesService } from '../deliveries/deliveries.service';

/**
 * Historique de livraison d'une notification (§25) : "Notification créée ->
 * Email envoyé -> Provider accepté -> Delivered" ou "Email -> FAILED ->
 * Retry -> SUCCESS". Réservé à SUPERADMIN (§26).
 */
@Controller('admin/audit/notifications')
@UseGuards(RolesGuard)
@Roles('SUPERADMIN')
export class AuditController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Get(':id/deliveries')
  findDeliveries(@Param('id', ParseUUIDPipe) id: string) {
    return this.deliveries.findByNotification(id);
  }
}
