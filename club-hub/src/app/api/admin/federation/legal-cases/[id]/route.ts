import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLegalCaseBundleForClub } from "@/services/LegalCaseService";
import { LegalCaseWorkflowError } from "../../../../../../../../packages/regulatory-shared/src/legalCase";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    return NextResponse.json(await getLegalCaseBundleForClub(session.user.teamId, id));
  } catch (error) {
    if (error instanceof LegalCaseWorkflowError) return NextResponse.json({ error: error.message }, { status: 404 });
    console.error("Error loading legal case:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
