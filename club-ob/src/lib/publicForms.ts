/**
 * club-hub héberge déjà les formulaires publics qui écrivent en base
 * (inscription académie, recrutement, contact — même principe que
 * `/devenir-sponsor/[teamId]`, voir `sponsor.ts`). Ce site, entièrement
 * lecture seule, renvoie simplement vers ces pages existantes plutôt que de
 * dupliquer les flux d'écriture.
 */
function clubHubBase(): string | null {
  const base = process.env.NEXT_PUBLIC_CLUB_HUB_URL?.trim().replace(/\/+$/, "");
  return base || null;
}

export function getInscriptionUrl(teamId: string): string | null {
  const base = clubHubBase();
  return base ? `${base}/inscription/${teamId}` : null;
}

export function getRecruitmentUrl(teamId: string): string | null {
  const base = clubHubBase();
  return base ? `${base}/recrutement/${teamId}` : null;
}

export function getContactFormUrl(teamId: string): string | null {
  const base = clubHubBase();
  return base ? `${base}/contact/${teamId}` : null;
}
