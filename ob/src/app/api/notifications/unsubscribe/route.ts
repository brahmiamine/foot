import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { ObPushSubscription } from "@/entities/ObPushSubscription";
import { requireMember } from "@/lib/community/requireMember";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const dataSource = await getDataSource();
  await dataSource.getRepository(ObPushSubscription).delete({ endpoint, userId: auth.data.session.id });

  return NextResponse.json({ success: true });
}
