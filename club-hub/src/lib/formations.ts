/**
 * Préréglages de formation : positions (x, y en % du terrain, 0 = ligne de
 * fond adverse en haut, 100 = ligne de but de l'équipe en bas) pour les 11
 * titulaires, gardien inclus en premier. Utilisé pour placer automatiquement
 * les titulaires sur le terrain quand une formation est choisie ; chaque
 * joueur reste ensuite déplaçable librement (glisser-déposer).
 */
export interface FormationSlot {
  x: number;
  y: number;
}

export const FORMATIONS: Record<string, FormationSlot[]> = {
  "4-4-2": [
    { x: 50, y: 92 },
    { x: 15, y: 74 }, { x: 38, y: 78 }, { x: 62, y: 78 }, { x: 85, y: 74 },
    { x: 15, y: 48 }, { x: 38, y: 52 }, { x: 62, y: 52 }, { x: 85, y: 48 },
    { x: 38, y: 20 }, { x: 62, y: 20 },
  ],
  "4-3-3": [
    { x: 50, y: 92 },
    { x: 15, y: 74 }, { x: 38, y: 78 }, { x: 62, y: 78 }, { x: 85, y: 74 },
    { x: 30, y: 50 }, { x: 50, y: 55 }, { x: 70, y: 50 },
    { x: 20, y: 20 }, { x: 50, y: 15 }, { x: 80, y: 20 },
  ],
  "4-2-3-1": [
    { x: 50, y: 92 },
    { x: 15, y: 74 }, { x: 38, y: 78 }, { x: 62, y: 78 }, { x: 85, y: 74 },
    { x: 35, y: 58 }, { x: 65, y: 58 },
    { x: 20, y: 35 }, { x: 50, y: 38 }, { x: 80, y: 35 },
    { x: 50, y: 15 },
  ],
  "3-5-2": [
    { x: 50, y: 92 },
    { x: 25, y: 76 }, { x: 50, y: 80 }, { x: 75, y: 76 },
    { x: 10, y: 50 }, { x: 32, y: 55 }, { x: 50, y: 58 }, { x: 68, y: 55 }, { x: 90, y: 50 },
    { x: 38, y: 18 }, { x: 62, y: 18 },
  ],
  "5-3-2": [
    { x: 50, y: 92 },
    { x: 10, y: 72 }, { x: 30, y: 78 }, { x: 50, y: 80 }, { x: 70, y: 78 }, { x: 90, y: 72 },
    { x: 30, y: 50 }, { x: 50, y: 54 }, { x: 70, y: 50 },
    { x: 38, y: 18 }, { x: 62, y: 18 },
  ],
};

export const FORMATION_CODES = Object.keys(FORMATIONS);
export const DEFAULT_FORMATION = "4-3-3";
