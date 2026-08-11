import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { RegisterPushSubscriptionDto } from './dto/register-push-subscription.dto';
import { PushSubscriptionsService } from './push-subscriptions.service';

@Controller('api/push-subscriptions')
export class PushSubscriptionsController {
  constructor(private readonly service: PushSubscriptionsService) {}

  @Get()
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findByUser(user.id);
  }

  @Post()
  async register(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterPushSubscriptionDto,
  ) {
    return this.service.register(user.id, dto);
  }

  @Delete(':deviceId')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('deviceId') deviceId: string,
  ) {
    await this.service.remove(user.id, deviceId);
    return { success: true };
  }
}
