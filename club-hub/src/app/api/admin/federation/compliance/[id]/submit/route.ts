import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { submitClubLicenseApplication } from "@/services/ClubLicenseService";
import { ClubLicenseWorkflowError } from "../../../../../../../../../packages/regulatory-shared/src/clubLicensing";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "CLUB_ADMIN") {
    return NextResponse.json({ error: "Action réservée à l’administrateur du club" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const application = await submitClubLicenseApplication(session.user.teamId, id, {
      userId: session.user.id,
      role: session.user.role,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json(application);
  } catch (error) {
    if (error instanceof ClubLicenseWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Error submitting club compliance dossier:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
