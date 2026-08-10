/**
 * Catégories d'âge internes (Seniors -> U7) utilisées pour scoper joueurs,
 * staff, matchs amicaux et entraînements par équipe interne du club. Mêmes
 * valeurs que `teams.age_category` (référentiel partagé), mais ce champ est
 * propre à teamManager : un club peut gérer plusieurs équipes internes sous
 * un seul compte club (un seul `teamId` de connexion).
 */
export const AGE_CATEGORIES = [
  "seniors",
  "u21",
  "u20",
  "u19",
  "u18",
  "u17",
  "u16",
  "u15",
  "u14",
  "u13",
  "u12",
  "u11",
  "u10",
  "u9",
  "u8",
  "u7",
] as const;

export type AgeCategory = (typeof AGE_CATEGORIES)[number];

export const AGE_CATEGORY_LABELS: Record<AgeCategory, string> = {
  seniors: "Seniors",
  u21: "U21",
  u20: "U20",
  u19: "U19",
  u18: "U18",
  u17: "U17",
  u16: "U16",
  u15: "U15",
  u14: "U14",
  u13: "U13",
  u12: "U12",
  u11: "U11",
  u10: "U10",
  u9: "U9",
  u8: "U8",
  u7: "U7",
};
