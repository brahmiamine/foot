import { NextRequest, NextResponse } from "next/server";
import { purgeStalePendingTickets } from "@/lib/tickets";
import { purgeStalePendingSubscriptions } from "@/lib/subscriptions";
import { UnauthorizedError } from "@/lib/errors";
import { handleApiError } from "@/lib/api";

/**
 * Libère les réservations PENDING abandonnées depuis plus de 30 minutes,
 * toutes catégories confondues (voir purgeStalePendingTickets). Un
 * scheduler in-process (instrumentation.ts) appelle déjà cette même logique
 * toutes les 5 minutes sans passer par HTTP ; cette route reste disponible
 * pour les déploiements qui préfèrent un ordonnanceur externe (cron
 * système, systemd timer, cron du provider d'hébergement) ou du
 * multi-instance — jamais appelée par un navigateur, d'où l'authentification
 * par secret partagé plutôt que par session. Voir README.md pour un exemple
 * de crontab.
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

    const [tickets, subscriptions] = await Promise.all([purgeStalePendingTickets(), purgeStalePendingSubscriptions()]);
    return NextResponse.json({ ...tickets, ...subscriptions });
  } catch (error) {
    return handleApiError(error);
  }
}
