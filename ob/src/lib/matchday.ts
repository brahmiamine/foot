const TUNIS_DAY_KEY = new Intl.DateTimeFormat("fr-CA", { timeZone: "Africa/Tunis" });

/** Compare deux dates par jour civil à Tunis (indépendamment de l'heure UTC du serveur). */
export function isSameTunisDay(a: Date, b: Date): boolean {
  return TUNIS_DAY_KEY.format(a) === TUNIS_DAY_KEY.format(b);
}
