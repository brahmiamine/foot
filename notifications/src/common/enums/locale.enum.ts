export enum NotificationLocale {
  FR = 'fr',
  AR = 'ar',
  EN = 'en',
}

export const DEFAULT_LOCALE = NotificationLocale.FR;

export const RTL_LOCALES: ReadonlySet<NotificationLocale> = new Set([
  NotificationLocale.AR,
]);
