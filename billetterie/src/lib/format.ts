function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const DAY_FORMATTER = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "Africa/Tunis" });
const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Tunis" });
const TIME_FORMATTER = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" });

/** "Dimanche 21 déc. 2026 · 18h00" */
export function formatMatchDateTime(date: Date): string {
  const day = capitalize(DAY_FORMATTER.format(date));
  const time = TIME_FORMATTER.format(date).replace(":", "h");
  return `${day} ${DATE_FORMATTER.format(date)} · ${time}`;
}

/** Prix stocké en `decimal` (donc en string côté TypeORM). */
export function formatPriceTnd(price: string): string {
  return `${Number(price).toFixed(3)} DT`;
}
