import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPlayerRegistrationBundleForClub } from "@/services/PlayerRegistrationService";
import { PlayerRegistrationWorkflowError } from "../../../../../../../../packages/regulatory-shared/src/playerRegistration";

export const runtime = "nodejs";
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { const { id } = await params; return NextResponse.json(await getPlayerRegistrationBundleForClub(session.user.teamId, id)); }
  catch (error) { if (error instanceof PlayerRegistrationWorkflowError) return NextResponse.json({ error: error.message }, { status: 404 }); console.error("Error loading player registration:", error); return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); }
}
