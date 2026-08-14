import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPlayerContractForClub, listPlayerContractsForClub, listPlayerContractOptionsForClub } from "@/services/PlayerContractService";
import { PLAYER_CONTRACT_TYPES, PlayerContractWorkflowError, type PlayerContractType } from "../../../../../../../packages/regulatory-shared/src/playerContract";

export const runtime = "nodejs";
const canManage = (role: string) => role === "ADMIN" || role === "CLUB_ADMIN";
const actor = (request: NextRequest, user: { id: string; role: string }) => ({ userId: user.id, role: user.role, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: request.headers.get("user-agent") });

export async function GET() {
  const session = await auth(); if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { const [contracts, options] = await Promise.all([listPlayerContractsForClub(session.user.teamId), listPlayerContractOptionsForClub(session.user.teamId)]); return NextResponse.json({ contracts, ...options, canManage: canManage(session.user.role) }); }
  catch (error) { console.error("Error loading player contracts:", error); return NextResponse.json({ error: "Erreur lors du chargement des contrats" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const session = await auth(); if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); if (!canManage(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { const body = await request.json() as Record<string, unknown>; if (!body.playerId || !body.seasonId || !body.contractType || !body.startDate || !body.endDate || !PLAYER_CONTRACT_TYPES.includes(body.contractType as PlayerContractType)) return NextResponse.json({ error: "Joueur, saison, type et dates sont requis" }, { status: 400 }); const contract = await createPlayerContractForClub(session.user.teamId, { playerId: String(body.playerId), seasonId: String(body.seasonId), contractType: body.contractType as PlayerContractType, startDate: String(body.startDate), endDate: String(body.endDate), salary: body.salary ? String(body.salary) : null, currency: body.currency ? String(body.currency) : null, agentId: body.agentId ? String(body.agentId) : null, bonusesJson: body.bonusesJson && typeof body.bonusesJson === "object" ? body.bonusesJson as Record<string, unknown> : null }, actor(request, session.user)); return NextResponse.json(contract, { status: 201 }); }
  catch (error) { if (error instanceof PlayerContractWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 }); console.error("Error creating player contract:", error); return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
}
