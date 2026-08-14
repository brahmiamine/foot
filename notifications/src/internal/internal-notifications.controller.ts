import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { CurrentService } from '../auth/decorators/current-service.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { AuthenticatedService } from '../common/interfaces/authenticated-user.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInternalNotificationDto } from './dto/create-internal-notification.dto';

/**
 * API interne (§28) : réservée aux applications backend de l'écosystème,
 * authentifiées par clé de service (§21) — jamais par JWT utilisateur.
 * `@Public()` désactive le JwtAuthGuard global (qui exigerait un JWT
 * utilisateur) au profit de ServiceAuthGuard. Un seul destinataire
 * (`userId`) ou une cible broadcast (`target`, §22) peuvent être fournis
 * dans le même payload.
 */
@Controller('internal/notifications')
@Public()
@UseGuards(ServiceAuthGuard)
export class InternalNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentService() service: AuthenticatedService,
    @Body() dto: CreateInternalNotificationDto,
  ) {
    return this.notificationsService.dispatchEvent(service.application, dto);
  }
}
