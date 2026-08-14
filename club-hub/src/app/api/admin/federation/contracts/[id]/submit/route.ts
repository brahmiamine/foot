import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { submitPlayerContract } from "@/services/PlayerContractService";
import { PlayerContractWorkflowError } from "../../../../../../../../../packages/regulatory-shared/src/playerContract";
export const runtime = "nodejs";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const session = await auth(); if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); if (!["ADMIN", "CLUB_ADMIN"].includes(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); try { const { id } = await params; return NextResponse.json(await submitPlayerContract(session.user.teamId, id, { userId: session.user.id, role: session.user.role, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: request.headers.get("user-agent") })); } catch (error) { if (error instanceof PlayerContractWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 }); return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); } }
