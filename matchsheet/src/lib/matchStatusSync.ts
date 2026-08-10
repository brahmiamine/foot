/**
 * Remonte le statut réel du match vers le référentiel partagé (superadmin),
 * qui ne le mettait jamais à jour lui-même — `matches.status` restait
 * UPCOMING indéfiniment (aucune app n'écrivait ce champ avant ce fix).
 * Best-effort : ne doit jamais faire échouer l'action de matchsheet
 * elle-même (même principe que le journal d'audit dans arbinote/superadmin).
 */
export async function syncMatchStatus(matchId: string, status: "IN_PROGRESS" | "FINISHED"): Promise<void> {
  const superadminUrl = process.env.SUPERADMIN_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!superadminUrl || !secret) {
    console.error("SUPERADMIN_URL/INTERNAL_API_SECRET not set, skipping match status sync");
    return;
  }

  try {
    const response = await fetch(`${superadminUrl}/api/internal/matches/${matchId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      console.error(`Failed to sync match status to superadmin: ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to sync match status to superadmin:", error);
  }
}
