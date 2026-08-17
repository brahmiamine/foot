import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { SheetAmendmentService } from "@/services/SheetAmendmentService";

export const runtime = "nodejs";

const service = new SheetAmendmentService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sheetId: string }> },
) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const { sheetId: raw } = await params;
  const sheetId = Number(raw);
  if (!Number.isInteger(sheetId) || sheetId <= 0) {
    return NextResponse.json({ error: "sheetId invalide" }, { status: 400 });
  }
  return NextResponse.json({ amendments: await service.listBySheet(sheetId) });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sheetId: string }> },
) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const { sheetId: raw } = await params;
    const sheetId = Number(raw);
    if (!Number.isInteger(sheetId) || sheetId <= 0) {
      return NextResponse.json({ error: "sheetId invalide" }, { status: 400 });
    }
    const body = (await request.json()) as { reason?: unknown; actorName?: unknown };
    if (typeof body.reason !== "string") {
      return NextResponse.json({ error: "Un motif est obligatoire" }, { status: 400 });
    }
    const amendment = await service.request(sheetId, body.reason, {
      actorUserId: request.headers.get("x-actor-user-id")?.trim() || null,
      actorName: typeof body.actorName === "string" ? body.actorName.trim() || null : null,
    });
    return NextResponse.json(amendment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de demander l'amendement" },
      { status: 400 },
    );
  }
}
