import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDataSource } from "@/lib/database";
import { PersonLicense } from "@/entities/PersonLicense";
import { submitPersonLicense } from "@/services/PersonLicenseService";
import { isPersonLicensingWindowOpen } from "@/services/SeasonRegulatoryCycleService";
import { PersonLicenseWorkflowError } from "../../../../../../../../../packages/regulatory-shared/src/personLicensing";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "CLUB_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    const dataSource = await getDataSource();
    const license = await dataSource.getRepository(PersonLicense).findOne({ where: { id, clubId: session.user.teamId } });
    if (!license) return NextResponse.json({ error: "Demande de licence introuvable" }, { status: 404 });
    if (!await isPersonLicensingWindowOpen(license.seasonId, dataSource)) {
      return NextResponse.json({ error: "La campagne de licences individuelles est fermée pour cette saison" }, { status: 409 });
    }
    return NextResponse.json(await submitPersonLicense(session.user.teamId, id, {
      userId: session.user.id,
      role: session.user.role,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    }, dataSource));
  } catch (error) {
    if (error instanceof PersonLicenseWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Error submitting person license:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
