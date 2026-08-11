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
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const authKey = typeof body.keys?.auth === "string" ? body.keys.auth : "";

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "Abonnement invalide" }, { status: 400 });
  }

  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(ObPushSubscription);
  const existing = await repository.findOne({ where: { endpoint } });

  if (existing) {
    existing.userId = auth.data.session.id;
    existing.p256dh = p256dh;
    existing.auth = authKey;
    await repository.save(existing);
  } else {
    await repository.save(
      repository.create({ userId: auth.data.session.id, endpoint, p256dh, auth: authKey })
    );
  }

  return NextResponse.json({ success: true });
}
