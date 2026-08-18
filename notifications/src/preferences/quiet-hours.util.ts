import { DigestMode } from '../common/enums/digest-mode.enum';

export interface UserNotificationSchedule {
  timezone: string;
  /** Format 'HH:mm', horaire local à `timezone`. NULL = heures calmes désactivées. */
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  digestMode: DigestMode;
}

export const DEFAULT_TIMEZONE = 'Africa/Tunis';

export const DEFAULT_SCHEDULE: UserNotificationSchedule = {
  timezone: DEFAULT_TIMEZONE,
  quietHoursStart: null,
  quietHoursEnd: null,
  digestMode: DigestMode.IMMEDIATE,
};

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(at: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(at).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Certaines implémentations d'Intl rendent minuit "24:00" plutôt que "00:00".
    hour: parts.hour === '24' ? 0 : Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Décalage (en minutes) de `timeZone` par rapport à UTC, au voisinage de `at`. */
function zonedOffsetMinutes(at: Date, timeZone: string): number {
  const zp = zonedParts(at, timeZone);
  const asUtc = Date.UTC(
    zp.year,
    zp.month - 1,
    zp.day,
    zp.hour,
    zp.minute,
    zp.second,
  );
  return Math.round((asUtc - at.getTime()) / 60_000);
}

function parseHm(value: string): number {
  const [hour, minute] = value.split(':').map((part) => Number(part));
  return hour * 60 + minute;
}

/**
 * NOTIF-002 : renvoie le délai (ms) à ajouter à `at` pour que l'envoi tombe
 * après la fin des heures calmes de l'utilisateur, ou 0 si `at` n'y tombe
 * pas (ou si aucune heure calme n'est configurée). L'appelant est
 * responsable de ne jamais invoquer cette fonction pour une notification
 * URGENT (bypass total, §NOTIF-002).
 */
export function computeQuietHoursDelayMs(
  schedule: Pick<
    UserNotificationSchedule,
    'timezone' | 'quietHoursStart' | 'quietHoursEnd'
  >,
  at: Date,
): number {
  if (!schedule.quietHoursStart || !schedule.quietHoursEnd) return 0;
  const timezone = schedule.timezone || DEFAULT_TIMEZONE;

  const startMin = parseHm(schedule.quietHoursStart);
  const endMin = parseHm(schedule.quietHoursEnd);
  if (startMin === endMin) return 0;

  const zp = zonedParts(at, timezone);
  const nowMin = zp.hour * 60 + zp.minute;
  const wraps = startMin > endMin;
  const inWindow = wraps
    ? nowMin >= startMin || nowMin < endMin
    : nowMin >= startMin && nowMin < endMin;
  if (!inWindow) return 0;

  const dayOffset = wraps && nowMin >= startMin ? 1 : 0;
  const offsetMinutes = zonedOffsetMinutes(at, timezone);
  const endHour = Math.floor(endMin / 60);
  const endMinute = endMin % 60;
  const targetUtcMs =
    Date.UTC(zp.year, zp.month - 1, zp.day + dayOffset, endHour, endMinute, 0) -
    offsetMinutes * 60_000;

  return Math.max(0, targetUtcMs - at.getTime());
}
