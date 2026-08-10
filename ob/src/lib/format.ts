const DAY_FORMATTER = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "Africa/Tunis" });
const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Tunis" });

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** "Dimanche · 18h00" */
export function formatMatchDateTime(date: Date): string {
  const day = capitalize(DAY_FORMATTER.format(date));
  const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" })
    .format(date)
    .replace(":", "h");
  return `${day} · ${time}`;
}

/** "13 Fév 2026" */
export function formatShortDate(date: Date): string {
  return capitalize(DATE_FORMATTER.format(date));
}

/** "21 nov. 2026 · 15h00" — utilisé partout où plusieurs dates coexistent (calendrier complet). */
export function formatFullDateTime(date: Date): string {
  const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" })
    .format(date)
    .replace(":", "h");
  return `${formatShortDate(date)} · ${time}`;
}

/** Product.price est stocké en `decimal` (donc en string côté TypeORM). */
export function formatPriceTnd(price: string): string {
  const value = Number(price);
  return `${value.toFixed(3)} DT`;
}

export function calcAge(birthDate: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age;
}
