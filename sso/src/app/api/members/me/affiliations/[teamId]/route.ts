import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { removeMemberAffiliation } from "@/lib/memberAffiliations";

export async function DELETE(_request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const session = await getCurrentSession();
  if (!session || session.role !== "MEMBER") {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { teamId } = await params;
  await removeMemberAffiliation(session.id, teamId);
  return NextResponse.json({ ok: true });
}
