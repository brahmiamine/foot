import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { getSsoSessionFromRequest } from "@/lib/ssoSession";
import { scanTicket, listRecentScans } from "@/lib/tickets";
import { handleApiError } from "@/lib/api";

// GET /api/admin/tickets/scan — les derniers scans (succès et refus), pour
// le panneau "derniers scans" de /admin/scan.
export async function GET(request: NextRequest) {
  try {
    const unauthorized = await ensureAdminAuth(request);
    if (unauthorized) return unauthorized;

    const scans = await listRecentScans();
    return NextResponse.json({ scans });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/admin/tickets/scan { token } — scanne un billet (jeton lu par
// une douchette QR/code-barres ou saisi/collé manuellement, voir
// src/lib/ticketQr.ts). Marque le billet USED s'il est valide et encore
// PAID ; jamais un throw pour un refus attendu (déjà utilisé, pas payé,
// match annulé) — voir src/lib/tickets.ts, scanTicket.
export async function POST(request: NextRequest) {
  try {
    const unauthorized = await ensureAdminAuth(request);
    if (unauthorized) return unauthorized;
    const session = await getSsoSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      return NextResponse.json({ error: "Jeton manquant." }, { status: 400 });
    }

    const result = await scanTicket(token, session.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
