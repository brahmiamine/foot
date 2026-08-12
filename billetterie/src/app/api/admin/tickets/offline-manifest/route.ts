import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { getOfflineScanManifest } from "@/lib/tickets";
import { handleApiError } from "@/lib/api";

// GET /api/admin/tickets/offline-manifest?matchId=... — téléchargé en ligne
// avant d'entrer dans une zone sans réseau, voir getOfflineScanManifest
// (src/lib/tickets.ts) pour ce que contient le manifeste et pourquoi.
export async function GET(request: NextRequest) {
  try {
    const unauthorized = await ensureAdminAuth(request);
    if (unauthorized) return unauthorized;

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
