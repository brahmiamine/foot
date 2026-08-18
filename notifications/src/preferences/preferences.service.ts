import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationChannelType } from '../common/enums/channel.enum';
import {
  DEFAULT_LOCALE,
  NotificationLocale,
} from '../common/enums/locale.enum';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationSchedule } from './entities/notification-schedule.entity';
import { UserLocale } from './entities/user-locale.entity';
import { PreferenceEntryDto } from './dto/upsert-preference.dto';
import { SetScheduleDto } from './dto/set-schedule.dto';
import { DEFAULT_SCHEDULE, UserNotificationSchedule } from './quiet-hours.util';

/** Canaux activés par défaut tant que l'utilisateur n'a rien configuré. */
const DEFAULT_ENABLED: Record<NotificationChannelType, boolean> = {
  [NotificationChannelType.IN_APP]: true,
  [NotificationChannelType.EMAIL]: true,
  [NotificationChannelType.PUSH]: true,
  [NotificationChannelType.SMS]: false,
};

@Injectable()
export class PreferencesService {
  constructor(
    @InjectRepository(NotificationPreference)
    private readonly repository: Repository<NotificationPreference>,
    @InjectRepository(UserLocale)
    private readonly localeRepository: Repository<UserLocale>,
    @InjectRepository(NotificationSchedule)
    private readonly scheduleRepository: Repository<NotificationSchedule>,
  ) {}

  /** NOTIF-002/NOTIF-003 : heures calmes, timezone et mode de digest de l'utilisateur. */
  async getSchedule(userId: string): Promise<UserNotificationSchedule> {
    const row = await this.scheduleRepository.findOne({ where: { userId } });
    if (!row) return DEFAULT_SCHEDULE;
    return {
      timezone: row.timezone,
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
      digestMode: row.digestMode,
    };
  }

  async setSchedule(
    userId: string,
    dto: SetScheduleDto,
  ): Promise<UserNotificationSchedule> {
    await this.scheduleRepository.save({
      userId,
      timezone: dto.timezone,
      quietHoursStart: dto.quietHoursStart ?? null,
      quietHoursEnd: dto.quietHoursEnd ?? null,
      digestMode: dto.digestMode,
    });
    return this.getSchedule(userId);
  }

  async getLocale(userId: string): Promise<NotificationLocale> {
    const row = await this.localeRepository.findOne({ where: { userId } });
    return row?.locale ?? DEFAULT_LOCALE;
  }

  async setLocale(userId: string, locale: NotificationLocale): Promise<void> {
    await this.localeRepository.save({ userId, locale });
  }

  async findByUser(userId: string): Promise<NotificationPreference[]> {
    return this.repository.find({ where: { userId } });
  }

  async isChannelEnabled(
    userId: string,
    category: string,
    channel: NotificationChannelType,
  ): Promise<boolean> {
    const pref = await this.repository.findOne({
      where: { userId, category, channel },
    });
    return pref ? pref.enabled : DEFAULT_ENABLED[channel];
  }

  /** Résout, pour un utilisateur et une catégorie, l'ensemble des canaux candidats effectivement activés. */
  async resolveEnabledChannels(
    userId: string,
    category: string,
    candidateChannels: NotificationChannelType[],
  ): Promise<NotificationChannelType[]> {
    const rows = await this.repository.find({ where: { userId, category } });
    const overrides = new Map(rows.map((row) => [row.channel, row.enabled]));
    return candidateChannels.filter(
      (channel) => overrides.get(channel) ?? DEFAULT_ENABLED[channel],
    );
  }

  async upsertMany(
    userId: string,
    entries: PreferenceEntryDto[],
  ): Promise<NotificationPreference[]> {
    const results: NotificationPreference[] = [];
    for (const entry of entries) {
      let pref = await this.repository.findOne({
        where: { userId, category: entry.category, channel: entry.channel },
      });
      if (!pref) {
        pref = this.repository.create({
          userId,
          category: entry.category,
          channel: entry.channel,
          enabled: entry.enabled,
        });
      } else {
        pref.enabled = entry.enabled;
      }
      results.push(await this.repository.save(pref));
    }
    return results;
  }
}
