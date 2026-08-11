import { NextRequest, NextResponse } from "next/server";
import { purgeStalePendingTickets } from "@/lib/tickets";
import { UnauthorizedError } from "@/lib/errors";
import { handleApiError } from "@/lib/api";

/**
 * Libère les réservations PENDING abandonnées depuis plus de 30 minutes,
 * toutes catégories confondues (voir purgeStalePendingTickets). Pas de
 * scheduler in-process dans ce dépôt (voir avancement.md § C) : cette route
 * est destinée à être appelée périodiquement par un ordonnanceur externe
 * (cron système, systemd timer, cron du provider d'hébergement) — jamais
 * par un navigateur, d'où l'authentification par secret partagé plutôt que
 * par session. Voir README.md pour un exemple de crontab.
 */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("x-cron-secret") === secret;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      throw new UnauthorizedError("Secret de purge manquant ou invalide.");
    }

    const result = await purgeStalePendingTickets();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
