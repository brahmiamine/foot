import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { removeMemberAffiliation } from "@/lib/memberAffiliations";
import { isTrustedOrigin } from "@/lib/csrf";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
  }

  const session = await getCurrentSession();
  if (!session || session.role !== "MEMBER") {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { teamId } = await params;
  await removeMemberAffiliation(session.id, teamId);
  return NextResponse.json({ ok: true });
}
