import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDataSource } from "@/lib/database";
import {
  ClubFederalOperationError,
  createClubGrantApplication,
  createClubInsuranceDraft,
  listClubFederalOperations,
  submitClubGrantApplication,
  submitClubInsurance,
  submitClubRegulatoryDocument,
} from "@/services/ClubFederalOperationsService";

export const runtime = "nodejs";

function isClubAdministrator(role: string): boolean {
  return role === "ADMIN" || role === "CLUB_ADMIN";
}

function auditActor(request: NextRequest, user: { id: string; role: string }) {
  return {
    userId: user.id,
    role: user.role,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const dataSource = await getDataSource();
    const result = await listClubFederalOperations(session.user.teamId, dataSource);
    return NextResponse.json({ ...result, canManage: isClubAdministrator(session.user.role) });
  } catch (error) {
    if (error instanceof ClubFederalOperationError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Error loading club federal operations:", error);
    return NextResponse.json({ error: "Erreur lors du chargement des opérations fédérales" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isClubAdministrator(session.user.role)) return NextResponse.json({ error: "Action réservée à l'administrateur du club" }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const dataSource = await getDataSource();
    const actor = auditActor(request, session.user);
    const teamId = session.user.teamId;
    if (action === "insurance.create") return NextResponse.json(await createClubInsuranceDraft(teamId, actor, body, dataSource), { status: 201 });
    if (action === "insurance.submit") return NextResponse.json(await submitClubInsurance(teamId, actor, String(body.id ?? ""), dataSource));
    if (action === "grant.create") return NextResponse.json(await createClubGrantApplication(teamId, actor, body, dataSource), { status: 201 });
    if (action === "grant.submit") return NextResponse.json(await submitClubGrantApplication(teamId, actor, String(body.id ?? ""), dataSource));
    if (action === "document.submit") return NextResponse.json(await submitClubRegulatoryDocument(teamId, actor, body, dataSource), { status: 201 });
    return NextResponse.json({ error: "Action inconnue" }, { status: 404 });
  } catch (error) {
    if (error instanceof ClubFederalOperationError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Error mutating club federal operations:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
