import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { ensureScanDeviceAuth } from "@/lib/scanDeviceAuth";
import { getOfflineScanManifest } from "@/lib/tickets";
import { handleApiError } from "@/lib/api";

// GET /api/admin/tickets/offline-manifest?matchId=... — téléchargé en ligne
// avant d'entrer dans une zone sans réseau, voir getOfflineScanManifest
// (src/lib/tickets.ts) pour ce que contient le manifeste et pourquoi.
// TICK-004 : exige un appareil scanner enregistré et non révoqué (voir
// src/lib/scanDeviceAuth.ts), même garde que /sync-scans.
export async function GET(request: NextRequest) {
  try {
    const unauthorized = await ensureAdminAuth(request);
    if (unauthorized) return unauthorized;
    const deviceAuth = await ensureScanDeviceAuth(request);
    if ("unauthorized" in deviceAuth) return deviceAuth.unauthorized;

    const matchId = request.nextUrl.searchParams.get("matchId")?.trim();
    if (!matchId) {
      return NextResponse.json({ error: "matchId manquant." }, { status: 400 });
    }

    const manifest = await getOfflineScanManifest(matchId);
    return NextResponse.json(manifest);
  } catch (error) {
    return handleApiError(error);
  }
}
