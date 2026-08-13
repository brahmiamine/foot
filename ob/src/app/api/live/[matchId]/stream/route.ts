import { getDataSource } from "@/lib/database";
import { Match } from "@/entities/Match";
import { LiveMatchService, type LiveEvent } from "@/services/LiveMatchService";
import { getObTeam } from "@/lib/ob-team";

export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 3_000;
const HEARTBEAT_INTERVAL_MS = 15_000;

interface LivePayload {
  status: "UPCOMING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";
  score: { home: number; away: number };
  events: LiveEvent[];
}

/**
 * TS-42 : première étape SSE pour le fil live (voir avancement.md, Epic
 * E13). Pas encore un vrai event bus (matchsheet -> ob, hors périmètre
 * tant qu'aucune infra de messagerie n'existe, voir Epic E20) : ce flux
 * interroge la base partagée côté serveur toutes les 3s (au lieu des 20s
 * de polling client existant, voir LiveMatchSection.tsx) et ne pousse au
 * navigateur que lorsque le contenu change réellement. Le polling client
 * existant reste le repli si l'EventSource échoue (proxy qui coupe le
 * flux, navigateur qui ne supporte pas SSE) — voir US-43.
 *
 * TASK-P0-011 : `matches` est une table partagée entre tous les clubs — sans
 * filtrer par OB_TEAM_ID, un `matchId` d'un autre club diffusait quand même
 * son fil live via ce flux public non authentifié. Le match doit désormais
 * impliquer l'équipe OB (domicile ou visiteur), vérifié à l'ouverture ET à
 * chaque tick (mêmes garde-fous que route.ts).
 */
export async function GET(_request: Request, context: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await context.params;

  const team = await getObTeam();
  if (!team) {
    return new Response("not_found", { status: 404 });
  }

  const ds = await getDataSource();
  const match = await ds.getRepository(Match).findOne({
    where: [
      { id: matchId, equipeHome: team.id },
      { id: matchId, equipeAway: team.id },
    ],
  });
  if (!match || !match.isPublicVisible) {
    return new Response("not_found", { status: 404 });
  }

  const encoder = new TextEncoder();
  let lastPayload: string | null = null;
  let closed = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Le client a déjà fermé la connexion entre-temps.
        }
      };

      const stop = () => {
        closed = true;
        if (pollTimer) clearInterval(pollTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
      };

      const tick = async () => {
        if (closed) return;
        try {
          const dataSource = await getDataSource();
          const current = await dataSource.getRepository(Match).findOne({ where: { id: matchId } });
          if (!current || !current.isPublicVisible) {
            send("closed", { reason: "not_found" });
            stop();
            controller.close();
            return;
          }

          const liveService = new LiveMatchService();
          const [events, score] = await Promise.all([
            liveService.getEvents(matchId),
            liveService.getLiveScore(matchId, current.equipeHome, current.equipeAway),
          ]);
          const payload: LivePayload = { status: current.status, score, events };
          const serialized = JSON.stringify(payload);

          if (serialized !== lastPayload) {
            lastPayload = serialized;
            send("update", payload);
          }

          if (current.status === "FINISHED" || current.status === "CANCELLED") {
            send("closed", { reason: "match_ended" });
            stop();
            controller.close();
          }
        } catch {
          // Erreur transitoire (DB, etc.) : on retente au prochain tick plutôt
          // que de fermer le flux — le client garde le dernier état connu.
        }
      };

      await tick();
      if (!closed) {
        pollTimer = setInterval(tick, POLL_INTERVAL_MS);
        heartbeatTimer = setInterval(() => {
          if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
        }, HEARTBEAT_INTERVAL_MS);
      }
    },
    cancel() {
      closed = true;
      if (pollTimer) clearInterval(pollTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
