import { Controller, Get, UseGuards } from '@nestjs/common';
import { SellerJwtGuard } from '../auth/guards/seller-jwt.guard';
import { CurrentSeller } from '../auth/decorators/current-seller.decorator';
import type { AuthenticatedSeller } from '../auth/interfaces/authenticated-seller.interface';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';

@Controller('notifications')
@UseGuards(SellerJwtGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  async findMine(
    @CurrentSeller() seller: AuthenticatedSeller,
  ): Promise<Notification[]> {
    return this.notificationsService.findAllForSeller(seller.sellerId);
  }
}
