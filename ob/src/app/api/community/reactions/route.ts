import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { ObReaction, REACTION_EMOJIS, type ObReactionTargetType } from "@/entities/ObReaction";
import { requireMember } from "@/lib/community/requireMember";

export const runtime = "nodejs";

const TARGET_TYPES: ObReactionTargetType[] = ["POST", "NEWS", "COMMENT"];

/** Bascule une réaction (on/off) : un clic de plus retire la réaction déjà posée. */
export async function POST(request: NextRequest) {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const targetType = body.targetType as ObReactionTargetType;
  const targetId = typeof body.targetId === "string" ? body.targetId : "";
  const emoji = typeof body.emoji === "string" ? body.emoji : "";

  if (!TARGET_TYPES.includes(targetType) || !targetId || !REACTION_EMOJIS.includes(emoji as never)) {
    return NextResponse.json({ error: "Réaction invalide" }, { status: 400 });
  }

  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(ObReaction);
  const userId = auth.data.session.id;

  const existing = await repository.findOne({ where: { targetType, targetId, userId, emoji } });
  if (existing) {
    await repository.remove(existing);
    const count = await repository.count({ where: { targetType, targetId, emoji } });
    return NextResponse.json({ success: true, active: false, count });
  }

  await repository.save(repository.create({ targetType, targetId, userId, emoji }));
  const count = await repository.count({ where: { targetType, targetId, emoji } });
  return NextResponse.json({ success: true, active: true, count });
}
