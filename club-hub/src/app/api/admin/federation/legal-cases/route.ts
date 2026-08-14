import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listLegalCasesForClub } from "@/services/LegalCaseService";
export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listLegalCasesForClub(session.user.teamId));
  } catch (error) {
    console.error("Error loading legal cases:", error);
    return NextResponse.json({ error: "Erreur lors du chargement des litiges" }, { status: 500 });
  }
}
