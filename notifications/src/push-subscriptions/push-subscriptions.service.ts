import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushSubscription } from './entities/push-subscription.entity';
import { RegisterPushSubscriptionDto } from './dto/register-push-subscription.dto';

@Injectable()
export class PushSubscriptionsService {
  constructor(
    @InjectRepository(PushSubscription)
    private readonly repository: Repository<PushSubscription>,
  ) {}

  async register(
    userId: string,
    dto: RegisterPushSubscriptionDto,
  ): Promise<PushSubscription> {
    let subscription = await this.repository.findOne({
      where: { userId, deviceId: dto.deviceId },
    });
    if (!subscription) {
      subscription = this.repository.create({ userId, deviceId: dto.deviceId });
    }
    subscription.platform = dto.platform;
    subscription.token = dto.token ?? null;
    subscription.endpoint = dto.endpoint ?? null;
    subscription.p256dh = dto.p256dh ?? null;
    subscription.auth = dto.auth ?? null;
    subscription.lastUsedAt = new Date();
    return this.repository.save(subscription);
  }

  async findByUser(userId: string): Promise<PushSubscription[]> {
    return this.repository.find({ where: { userId } });
  }

  async remove(userId: string, deviceId: string): Promise<void> {
    await this.repository.delete({ userId, deviceId });
  }

  async touchLastUsed(id: string): Promise<void> {
    await this.repository.update(id, { lastUsedAt: new Date() });
  }

  /** Supprime un abonnement devenu invalide (endpoint expiré / token désinstallé côté provider). */
  async removeById(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
