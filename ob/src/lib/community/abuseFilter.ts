/**
 * Filtrage automatique de premier niveau (#19) : bloque à la soumission les
 * messages contenant une insulte/un terme grossier évident, avant même
 * qu'un modérateur les voie. Liste volontairement courte et éditable par un
 * développeur — ce n'est pas un système anti-abus complet (pas de contexte,
 * pas de détection de contournement), juste un filet pour les cas flagrants.
 * Le reste (contenu limite, harcèlement, hors-sujet...) reste géré par la
 * modération manuelle (signalement + file d'attente staff).
 */
const BANNED_WORDS = [
  "connard",
  "connasse",
  "encule",
  "enculé",
  "salope",
  "pute",
  "putain",
  "batard",
  "bâtard",
  "fdp",
  "nique",
  "merde",
  "abruti",
  "debile",
  "débile",
  "raciste",
  "negre",
  "nègre",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const NORMALIZED_BANNED_WORDS = BANNED_WORDS.map(normalize);

export function containsAbusiveContent(text: string): boolean {
  const normalized = normalize(text);
  return NORMALIZED_BANNED_WORDS.some((word) => {
    const pattern = new RegExp(`(^|[^a-z0-9])${word}([^a-z0-9]|$)`, "i");
    return pattern.test(normalized);
  });
}
