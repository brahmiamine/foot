import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPersonLicenseBundleForClub } from "@/services/PersonLicenseService";
import { PersonLicenseWorkflowError } from "../../../../../../../../packages/regulatory-shared/src/personLicensing";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    return NextResponse.json(await getPersonLicenseBundleForClub(session.user.teamId, id));
  } catch (error) {
    if (error instanceof PersonLicenseWorkflowError) return NextResponse.json({ error: error.message }, { status: 404 });
    console.error("Error loading person license:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
