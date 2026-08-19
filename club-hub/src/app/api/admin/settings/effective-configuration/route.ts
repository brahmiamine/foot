import { NextRequest, NextResponse } from "next/server";
import { getUserAccess } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { EffectiveConfigurationService } from "@/services/EffectiveConfigurationService";

export const runtime = "nodejs";

/** GOV-006 — API de résolution expliquée de la configuration effective du club courant. */
export async function GET(request: NextRequest) {
  try {
    const access = await getUserAccess();
    if (!access.isClubAdmin) {
      return NextResponse.json({ error: "Accès réservé à l'administration du club" }, { status: 403 });
    }
    const teamId = await requireTeamId();
    const rawAt = request.nextUrl.searchParams.get("at");
    const at = rawAt ? new Date(rawAt) : new Date();
    if (Number.isNaN(at.getTime())) {
      return NextResponse.json({ error: "Date de résolution invalide" }, { status: 400 });
    }

    const sections = await new EffectiveConfigurationService().resolveForTeam(teamId, at);
    return NextResponse.json({ teamId, at: at.toISOString(), sections });
  } catch (error) {
    console.error("Error resolving effective club configuration:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de résoudre la configuration effective" },
      { status: 500 },
    );
  }
}
