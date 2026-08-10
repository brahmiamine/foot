/**
 * teamManager expose déjà un formulaire public de demande de sponsoring
 * (`/devenir-sponsor/[teamId]`, upload de logo + validation + création de
 * `cms_sponsor_requests`). Plutôt que dupliquer ce flux d'écriture dans ce
 * site (jusqu'ici entièrement lecture seule), on renvoie simplement vers
 * cette page existante.
 */
export function getSponsorRequestUrl(teamId: string): string | null {
  const base = process.env.NEXT_PUBLIC_TEAM_MANAGER_URL?.trim().replace(/\/+$/, "");
  return base ? `${base}/devenir-sponsor/${teamId}` : null;
}
