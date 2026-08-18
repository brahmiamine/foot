export type CommunityReaction = "LIKE" | "FIRE" | "BRAVO" | "SAD";

export interface PredictionScore {
  homeScore: number;
  awayScore: number;
  firstScorerId?: string | null;
}

export interface MatchResultScore {
  homeScore: number;
  awayScore: number;
  firstScorerId?: string | null;
}

export function parsePredictionScore(value: FormDataEntryValue | null): number {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 20) {
    throw new Error("INVALID_SCORE");
  }
  return numeric;
}

export function normalizeCommunityText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") throw new Error("INVALID_TEXT");
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized || normalized.length > maxLength) throw new Error("INVALID_TEXT");
  return normalized;
}

export function normalizeOptionalCommunityText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("INVALID_TEXT");
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new Error("INVALID_TEXT");
  return normalized;
}

export function normalizeHttpsImageUrl(value: unknown): string | null {
  const normalized = normalizeOptionalCommunityText(value, 1000);
  if (!normalized) return null;
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error("INVALID_IMAGE_URL");
  }
  if (url.protocol !== "https:") throw new Error("INVALID_IMAGE_URL");
  return url.toString();
}

export function isCommunityReaction(value: unknown): value is CommunityReaction {
  return value === "LIKE" || value === "FIRE" || value === "BRAVO" || value === "SAD";
}

function outcome(score: { homeScore: number; awayScore: number }): -1 | 0 | 1 {
  if (score.homeScore === score.awayScore) return 0;
  return score.homeScore > score.awayScore ? 1 : -1;
}

/**
 * Barème du résultat, distinct des 5 points de participation :
 * résultat correct 20 pts, score exact +30 pts, premier buteur +30 pts.
 */
export function calculatePredictionResultPoints(prediction: PredictionScore, result: MatchResultScore): number {
  let points = 0;
  if (outcome(prediction) === outcome(result)) points += 20;
  if (prediction.homeScore === result.homeScore && prediction.awayScore === result.awayScore) points += 30;
  if (prediction.firstScorerId && result.firstScorerId && prediction.firstScorerId === result.firstScorerId) points += 30;
  return points;
}

export function canSubmitPrediction(status: string, matchDate: Date | string | null | undefined, now = new Date()): boolean {
  if (status !== "UPCOMING" || !matchDate) return false;
  const kickoff = matchDate instanceof Date ? matchDate : new Date(matchDate);
  return Number.isFinite(kickoff.getTime()) && now.getTime() < kickoff.getTime();
}

/**
 * Les Server Actions de la communauté ne redirigent que vers des chemins
 * internes connus. Les articles acceptent uniquement un identifiant numérique.
 */
export function safeCommunityReturnPath(
  value: FormDataEntryValue | null,
): "/communaute" | "/espace-membre/communaute" | `/actualites/${number}` {
  if (value === "/espace-membre/communaute") return value;
  if (typeof value === "string" && /^\/actualites\/[1-9]\d*$/.test(value)) {
    return value as `/actualites/${number}`;
  }
  return "/communaute";
}
