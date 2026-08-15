import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDataSource } from "@/lib/database";
import { CompetitionRegistration } from "@/entities/Regulatory";
import { submitCompetitionEntry, updateCompetitionEntry } from "@/services/CompetitionRegistrationService";
import { isCompetitionEntryWindowOpen } from "@/services/SeasonRegulatoryCycleService";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await updateCompetitionEntry(session.user.teamId, (await params).id, await request.json()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const dataSource = await getDataSource();
    const entry = await dataSource.getRepository(CompetitionRegistration).findOne({ where: { id, clubId: session.user.teamId } });
    if (!entry) return NextResponse.json({ error: "Engagement introuvable" }, { status: 404 });
    if (!await isCompetitionEntryWindowOpen(entry.seasonId, dataSource)) {
      return NextResponse.json({ error: "La campagne d'engagement aux compétitions est fermée pour cette saison" }, { status: 409 });
    }
    return NextResponse.json(await submitCompetitionEntry(session.user.teamId, id, {
      userId: session.user.id,
      role: session.user.role,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 409 });
  }
}
