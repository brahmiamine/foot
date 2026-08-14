import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDataSource } from "@/lib/database";
import { createPersonLicenseForClub, listPersonLicenseCandidates, listPersonLicensesForClub } from "@/services/PersonLicenseService";
import { PERSON_LICENSE_TYPES, PersonLicenseWorkflowError, type PersonLicenseType } from "../../../../../../../packages/regulatory-shared/src/personLicensing";

export const runtime = "nodejs";

function canManage(role: string): boolean {
  return role === "ADMIN" || role === "CLUB_ADMIN";
}

function actor(request: NextRequest, user: { id: string; role: string }) {
  return { userId: user.id, role: user.role, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: request.headers.get("user-agent") };
}

export async function GET() {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const dataSource = await getDataSource();
    const [licenses, candidates, seasons] = await Promise.all([
      listPersonLicensesForClub(session.user.teamId, dataSource),
      listPersonLicenseCandidates(session.user.teamId, dataSource),
      dataSource.query("SELECT id, nom FROM saisons ORDER BY date_debut DESC, nom DESC") as Promise<Array<{ id: string; nom: string }>>,
    ]);
    return NextResponse.json({ licenses, candidates, seasons, canManage: canManage(session.user.role) });
  } catch (error) {
    console.error("Error loading person licenses:", error);
    return NextResponse.json({ error: "Erreur lors du chargement des licences" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.user.role)) return NextResponse.json({ error: "Action réservée à l’administrateur du club" }, { status: 403 });
  try {
    const body = await request.json() as { personType?: string; personReferenceId?: string; seasonId?: string; licenseType?: string; category?: string };
    if (!body.personType || !PERSON_LICENSE_TYPES.includes(body.personType as PersonLicenseType) || !body.personReferenceId || !body.seasonId || !body.licenseType) {
      return NextResponse.json({ error: "personType, personReferenceId, seasonId et licenseType sont requis" }, { status: 400 });
    }
    const license = await createPersonLicenseForClub(session.user.teamId, {
      personType: body.personType as PersonLicenseType,
      personReferenceId: body.personReferenceId,
      seasonId: body.seasonId,
      licenseType: body.licenseType,
      category: body.category,
    }, actor(request, session.user));
    return NextResponse.json(license, { status: 201 });
  } catch (error) {
    if (error instanceof PersonLicenseWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Error creating person license:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
