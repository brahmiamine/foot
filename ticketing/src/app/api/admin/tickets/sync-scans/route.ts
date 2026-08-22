import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { getSsoSessionFromRequest } from "@/lib/ssoSession";
import { ensureScanDeviceAuth } from "@/lib/scanDeviceAuth";
import { ScanDeviceService } from "@/services/ScanDeviceService";
import { syncScans, type SyncScanInput } from "@/lib/tickets";
import { TicketSaleGovernanceService } from "@/services/TicketSaleGovernanceService";
import { handleApiError } from "@/lib/api";

const MAX_BATCH_SIZE = 200;
const deviceService = new ScanDeviceService();
const governanceService = new TicketSaleGovernanceService();

// POST /api/admin/tickets/sync-scans { scans: [{ token, terminalId, scannedAt? }] }
// Synchronisation batch des scans accumulés hors-ligne (TASK-P0-008) —
// rejoue chaque scan côté serveur (source de vérité) et répond avec les
// billets acceptés vs en conflit (déjà scanné par un autre terminal/scan
// du même batch). Voir src/lib/tickets.ts, syncScans. TICK-004 : exige en
// plus une identité d'appareil enregistrée et non révoquée (x-scan-device-id
// / x-scan-device-secret) — c'est le flux spécifiquement hors-ligne, pas le
// scan en ligne (/api/admin/tickets/scan, resté inchangé).
export async function POST(request: NextRequest) {
  try {
    const unauthorized = await ensureAdminAuth(request);
    if (unauthorized) return unauthorized;
    const session = await getSsoSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const deviceAuth = await ensureScanDeviceAuth(request);
    if ("unauthorized" in deviceAuth) return deviceAuth.unauthorized;

    const body = await request.json().catch(() => ({}));
    const rawScans = Array.isArray(body?.scans) ? body.scans : [];
    if (rawScans.length === 0) {
      return NextResponse.json({ error: "scans manquant ou vide." }, { status: 400 });
    }
    if (rawScans.length > MAX_BATCH_SIZE) {
      return NextResponse.json({ error: `Trop de scans dans un même lot (max ${MAX_BATCH_SIZE}).` }, { status: 400 });
    }

    // TICK-005 — un manifeste hors-ligne trop ancien est refusé en bloc
    // plutôt que scan par scan : le staff doit retélécharger un manifeste
    // frais. `offlineManifestValidityMinutes` NULL = pas d'expiration
    // (comportement historique).
    const manifestGeneratedAt = typeof body?.manifestGeneratedAt === "string" ? body.manifestGeneratedAt : null;
    if (manifestGeneratedAt) {
      const settings = await governanceService.getSettings(deviceAuth.device.clubId);
      if (settings.offlineManifestValidityMinutes != null) {
        const ageMinutes = (Date.now() - new Date(manifestGeneratedAt).getTime()) / 60_000;
        if (ageMinutes > settings.offlineManifestValidityMinutes) {
          return NextResponse.json(
            { error: "Le manifeste hors-ligne a expiré, merci de le retélécharger avant de synchroniser." },
            { status: 409 },
          );
        }
      }
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
    await deviceService.touchLastSync(deviceAuth.device.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
