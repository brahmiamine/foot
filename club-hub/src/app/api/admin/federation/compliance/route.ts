import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDataSource } from "@/lib/database";
import {
  createClubLicenseApplication,
  listClubLicenseApplicationsForClub,
} from "@/services/ClubLicenseService";
import { ClubLicenseWorkflowError } from "../../../../../../../packages/regulatory-shared/src/clubLicensing";

export const runtime = "nodejs";

function auditActor(request: NextRequest, user: { id: string; role: string }) {
  return {
    userId: user.id,
    role: user.role,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}

function isClubAdministrator(role: string): boolean {
  return role === "ADMIN" || role === "CLUB_ADMIN";
}

export async function GET() {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const dataSource = await getDataSource();
    const [applications, seasons] = await Promise.all([
      listClubLicenseApplicationsForClub(session.user.teamId, dataSource),
      dataSource.query(
        "SELECT id, nom, date_debut AS dateDebut, date_fin AS dateFin FROM saisons ORDER BY date_debut DESC, nom DESC",
      ) as Promise<Array<{ id: string; nom: string; dateDebut: string | null; dateFin: string | null }>>,
    ]);
    return NextResponse.json({ applications, seasons, canManage: isClubAdministrator(session.user.role) });
  } catch (error) {
    console.error("Error loading club compliance dossiers:", error);
    return NextResponse.json({ error: "Erreur lors du chargement des dossiers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isClubAdministrator(session.user.role)) {
    return NextResponse.json({ error: "Action réservée à l’administrateur du club" }, { status: 403 });
  }
  try {
    const body = await request.json() as { seasonId?: string };
    if (!body.seasonId) return NextResponse.json({ error: "seasonId est requis" }, { status: 400 });
    const application = await createClubLicenseApplication(
      session.user.teamId,
      body.seasonId,
      auditActor(request, session.user),
    );
    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    if (error instanceof ClubLicenseWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Error creating club compliance dossier:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
