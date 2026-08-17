import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { SheetAmendmentService, type AmendmentDecision } from "@/services/SheetAmendmentService";

export const runtime = "nodejs";

const service = new SheetAmendmentService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sheetId: string; amendmentId: string }> },
) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const { sheetId: rawSheetId, amendmentId: rawAmendmentId } = await params;
    const sheetId = Number(rawSheetId);
    const amendmentId = Number(rawAmendmentId);
    if (!Number.isInteger(sheetId) || sheetId <= 0 || !Number.isInteger(amendmentId) || amendmentId <= 0) {
      return NextResponse.json({ error: "Identifiant d'amendement invalide" }, { status: 400 });
    }

    const body = (await request.json()) as { decision?: unknown; reason?: unknown; actorName?: unknown };
    if (body.decision !== "APPROVE" && body.decision !== "REJECT") {
      return NextResponse.json({ error: "decision doit être APPROVE ou REJECT" }, { status: 400 });
    }

    const amendment = await service.decide(
      sheetId,
      amendmentId,
      body.decision as AmendmentDecision,
      typeof body.reason === "string" ? body.reason : null,
      {
        actorUserId: request.headers.get("x-actor-user-id")?.trim() || "service:federation-hub",
        actorName: typeof body.actorName === "string" ? body.actorName.trim() || null : null,
      },
    );
    return NextResponse.json(amendment);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de décider l'amendement" },
      { status: 400 },
    );
  }
}
