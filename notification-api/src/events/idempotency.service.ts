import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEvent } from './entities/notification-event.entity';

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(NotificationEvent)
    private readonly eventRepository: Repository<NotificationEvent>,
  ) {}

  /** Retourne l'événement déjà traité pour (application, eventId), ou null si c'est une première réception. */
  async findExisting(
    application: string,
    eventId: string,
  ): Promise<NotificationEvent | null> {
    return this.eventRepository.findOne({ where: { application, eventId } });
  }

  async record(
    application: string,
    eventId: string,
    type: string,
    notificationIds: string[],
  ): Promise<NotificationEvent> {
    const event = this.eventRepository.create({
      application,
      eventId,
      type,
      notificationIds,
    });
    return this.eventRepository.save(event);
  }
}
