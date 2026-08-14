import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { getSsoSessionFromRequest } from "@/lib/ssoSession";
import { syncScans, type SyncScanInput } from "@/lib/tickets";
import { handleApiError } from "@/lib/api";

const MAX_BATCH_SIZE = 200;

// POST /api/admin/tickets/sync-scans { scans: [{ token, terminalId, scannedAt? }] }
// Synchronisation batch des scans accumulés hors-ligne (TASK-P0-008) —
// rejoue chaque scan côté serveur (source de vérité) et répond avec les
// billets acceptés vs en conflit (déjà scanné par un autre terminal/scan
// du même batch). Voir src/lib/tickets.ts, syncScans.
export async function POST(request: NextRequest) {
  try {
    const unauthorized = await ensureAdminAuth(request);
    if (unauthorized) return unauthorized;
    const session = await getSsoSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const rawScans = Array.isArray(body?.scans) ? body.scans : [];
    if (rawScans.length === 0) {
      return NextResponse.json({ error: "scans manquant ou vide." }, { status: 400 });
    }
    if (rawScans.length > MAX_BATCH_SIZE) {
      return NextResponse.json({ error: `Trop de scans dans un même lot (max ${MAX_BATCH_SIZE}).` }, { status: 400 });
    }

    const scans: SyncScanInput[] = [];
    for (const raw of rawScans) {
      const token = typeof raw?.token === "string" ? raw.token.trim() : "";
      const terminalId = typeof raw?.terminalId === "string" ? raw.terminalId.trim() : "";
      if (!token || !terminalId) {
        return NextResponse.json({ error: "Chaque scan doit fournir token et terminalId." }, { status: 400 });
      }
      scans.push({ token, terminalId, scannedAt: typeof raw?.scannedAt === "string" ? raw.scannedAt : undefined });
    }

    const result = await syncScans(scans, session.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
