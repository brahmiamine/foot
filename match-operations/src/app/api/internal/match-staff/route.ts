import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { MatchStaffService, MatchStaffWorkflowError } from "@/services/MatchStaffService";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request); if (unauthorized) return unauthorized;
  const matchId = request.nextUrl.searchParams.get("matchId");
  const teamId = request.nextUrl.searchParams.get("teamId") ?? undefined;
  if (!matchId) return NextResponse.json({ error: "matchId requis" }, { status: 400 });
  return NextResponse.json(await new MatchStaffService().list(matchId, teamId));
}

export async function POST(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request); if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    if (!body.matchId || !body.teamId || !body.staffId || !body.role) return NextResponse.json({ error: "matchId, teamId, staffId et role requis" }, { status: 400 });
    return NextResponse.json(await new MatchStaffService().assign({
      matchId: String(body.matchId), teamId: String(body.teamId), staffId: String(body.staffId), role: body.role,
      assignedBy: request.headers.get("x-actor-user-id"),
    }), { status: 201 });
  } catch (error) {
    if (error instanceof MatchStaffWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request); if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    if (!body.id || !body.teamId) return NextResponse.json({ error: "id et teamId requis" }, { status: 400 });
    await new MatchStaffService().remove(String(body.id), String(body.teamId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MatchStaffWorkflowError) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 500 });
  }
}
