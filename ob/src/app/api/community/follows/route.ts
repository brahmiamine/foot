import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { ObFollow } from "@/entities/ObFollow";
import { requireMember } from "@/lib/community/requireMember";

export const runtime = "nodejs";

const TARGET_TYPES = ["TEAM", "PLAYER"] as const;

export async function POST(request: NextRequest) {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const targetType = body.targetType as (typeof TARGET_TYPES)[number];
  const targetId = typeof body.targetId === "string" ? body.targetId : "";

  if (!TARGET_TYPES.includes(targetType) || !targetId) {
    return NextResponse.json({ error: "Cible de suivi invalide" }, { status: 400 });
  }

  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(ObFollow);
  const userId = auth.data.session.id;

  const existing = await repository.findOne({ where: { targetType, targetId, userId } });
  if (existing) {
    await repository.remove(existing);
    return NextResponse.json({ success: true, following: false });
  }

  await repository.save(repository.create({ targetType, targetId, userId }));
  return NextResponse.json({ success: true, following: true });
}
