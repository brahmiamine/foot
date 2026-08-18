import { NotificationChannelType } from '../common/enums/channel.enum';
import { DigestMode } from '../common/enums/digest-mode.enum';
import { NotificationLocale } from '../common/enums/locale.enum';
import { PreferencesService } from './preferences.service';

describe('PreferencesService', () => {
  let preferenceRows: Array<{
    userId: string;
    category: string;
    channel: NotificationChannelType;
    enabled: boolean;
  }>;
  let localeRows: Array<{ userId: string; locale: NotificationLocale }>;
  let scheduleRows: Array<{
    userId: string;
    timezone: string;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    digestMode: DigestMode;
  }>;
  let service: PreferencesService;

  beforeEach(() => {
    preferenceRows = [];
    localeRows = [];
    scheduleRows = [];

    const preferenceRepository = {
      find: jest.fn(
        (options: { where: { userId: string; category?: string } }) =>
          Promise.resolve(
            preferenceRows.filter(
              (row) =>
                row.userId === options.where.userId &&
                (options.where.category === undefined ||
                  row.category === options.where.category),
            ),
          ),
      ),
      findOne: jest.fn(
        (options: {
          where: {
            userId: string;
            category: string;
            channel: NotificationChannelType;
          };
        }) =>
          Promise.resolve(
            preferenceRows.find(
              (row) =>
                row.userId === options.where.userId &&
                row.category === options.where.category &&
                row.channel === options.where.channel,
            ) ?? null,
          ),
      ),
      create: jest.fn((data: Partial<(typeof preferenceRows)[number]>) => ({
        ...data,
      })),
      save: jest.fn((row: (typeof preferenceRows)[number]) => {
        const existingIndex = preferenceRows.findIndex(
          (candidate) =>
            candidate.userId === row.userId &&
            candidate.category === row.category &&
            candidate.channel === row.channel,
        );
        if (existingIndex >= 0) preferenceRows[existingIndex] = row;
        else preferenceRows.push(row);
        return Promise.resolve(row);
      }),
    };

    const localeRepository = {
      findOne: jest.fn((options: { where: { userId: string } }) =>
        Promise.resolve(
          localeRows.find((row) => row.userId === options.where.userId) ?? null,
        ),
      ),
      save: jest.fn((row: (typeof localeRows)[number]) => {
        localeRows = localeRows.filter(
          (candidate) => candidate.userId !== row.userId,
        );
        localeRows.push(row);
        return Promise.resolve(row);
      }),
    };

    const scheduleRepository = {
      findOne: jest.fn((options: { where: { userId: string } }) =>
        Promise.resolve(
          scheduleRows.find((row) => row.userId === options.where.userId) ??
            null,
        ),
      ),
      save: jest.fn((row: (typeof scheduleRows)[number]) => {
        scheduleRows = scheduleRows.filter(
          (candidate) => candidate.userId !== row.userId,
        );
        scheduleRows.push(row);
        return Promise.resolve(row);
      }),
    };

    service = new PreferencesService(
      preferenceRepository as never,
      localeRepository as never,
      scheduleRepository as never,
    );
  });

  it('enables IN_APP/EMAIL/PUSH and disables SMS by default when no preference is stored', async () => {
    const channels = await service.resolveEnabledChannels(
      'user-1',
      'MATCH_REMINDER',
      [
        NotificationChannelType.IN_APP,
        NotificationChannelType.EMAIL,
        NotificationChannelType.PUSH,
        NotificationChannelType.SMS,
      ],
    );

    expect(channels).toEqual([
      NotificationChannelType.IN_APP,
      NotificationChannelType.EMAIL,
      NotificationChannelType.PUSH,
    ]);
  });

  it('honours a stored override that disables a channel for a category', async () => {
    await service.upsertMany('user-1', [
      {
        category: 'MATCH_REMINDER',
        channel: NotificationChannelType.EMAIL,
        enabled: false,
      },
    ]);

    const channels = await service.resolveEnabledChannels(
      'user-1',
      'MATCH_REMINDER',
      [NotificationChannelType.IN_APP, NotificationChannelType.EMAIL],
    );

    expect(channels).toEqual([NotificationChannelType.IN_APP]);
  });

  it('scopes preferences per category: disabling EMAIL for MARKETING does not affect PAYMENT', async () => {
    await service.upsertMany('user-1', [
      {
        category: 'MARKETING',
        channel: NotificationChannelType.EMAIL,
        enabled: false,
      },
    ]);

    const paymentChannels = await service.resolveEnabledChannels(
      'user-1',
      'PAYMENT',
      [NotificationChannelType.EMAIL],
    );

    expect(paymentChannels).toEqual([NotificationChannelType.EMAIL]);
  });

  it('defaults to the French locale when none is set, and returns a stored override', async () => {
    expect(await service.getLocale('user-1')).toBe(NotificationLocale.FR);

    await service.setLocale('user-1', NotificationLocale.EN);

    expect(await service.getLocale('user-1')).toBe(NotificationLocale.EN);
  });

  it('defaults to no quiet hours and an IMMEDIATE digest when no schedule is stored', async () => {
    expect(await service.getSchedule('user-1')).toEqual({
      timezone: 'Africa/Tunis',
      quietHoursStart: null,
      quietHoursEnd: null,
      digestMode: DigestMode.IMMEDIATE,
    });
  });

  it('persists and returns a stored schedule override', async () => {
    await service.setSchedule('user-1', {
      timezone: 'Europe/Paris',
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      digestMode: DigestMode.DAILY,
    });

    expect(await service.getSchedule('user-1')).toEqual({
      timezone: 'Europe/Paris',
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      digestMode: DigestMode.DAILY,
    });
  });
});
