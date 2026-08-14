import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDataSource } from "@/lib/database";
import { createPlayerRegistrationForClub, listPlayerRegistrationsForClub, listRegistrationCandidates } from "@/services/PlayerRegistrationService";
import { PlayerRegistrationWorkflowError } from "../../../../../../../packages/regulatory-shared/src/playerRegistration";

export const runtime = "nodejs";
const canManage = (role: string) => role === "ADMIN" || role === "CLUB_ADMIN";
const actor = (request: NextRequest, user: { id: string; role: string }) => ({ userId: user.id, role: user.role, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: request.headers.get("user-agent") });

export async function GET() {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const source = await getDataSource();
    const [registrations, candidates, seasonRows] = await Promise.all([
      listPlayerRegistrationsForClub(session.user.teamId, source),
      listRegistrationCandidates(session.user.teamId, source),
      source.query("SELECT id, nom, type_competition AS competitionType, requires_player_contract AS requiresPlayerContract FROM saisons ORDER BY date_debut DESC, nom DESC") as Promise<Array<{ id: string; nom: string; competitionType: string; requiresPlayerContract: boolean }>>,
    ]);
    const seasons = seasonRows.map((season) => ({ ...season, requiresPlayerContract: Boolean(season.requiresPlayerContract) }));
    return NextResponse.json({ registrations, candidates, seasons, canManage: canManage(session.user.role) });
  } catch (error) {
    console.error("Error loading player registrations:", error);
    return NextResponse.json({ error: "Erreur lors du chargement des enregistrements" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as { playerId?: string; seasonId?: string; licenseId?: string; contractId?: string | null };
    if (!body.playerId || !body.seasonId || !body.licenseId) return NextResponse.json({ error: "playerId, seasonId et licenseId sont requis" }, { status: 400 });
    const registration = await createPlayerRegistrationForClub(session.user.teamId, { playerId: body.playerId, seasonId: body.seasonId, licenseId: body.licenseId, contractId: body.contractId }, actor(request, session.user));
    return NextResponse.json(registration, { status: 201 });
  } catch (error) {
    if (error instanceof PlayerRegistrationWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Error creating player registration:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
