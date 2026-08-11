import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { ObFanWallItem } from "@/entities/ObFanWallItem";
import { requireMember } from "@/lib/community/requireMember";
import { containsAbusiveContent } from "@/lib/community/abuseFilter";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 500;

export async function POST(request: NextRequest) {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === "string" && body.message.trim() ? body.message.trim() : null;
  const imageUrl = typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null;
  const videoUrl = typeof body.videoUrl === "string" && body.videoUrl.trim() ? body.videoUrl.trim() : null;

  if (!message && !imageUrl && !videoUrl) {
    return NextResponse.json({ error: "Ajoutez un message, une photo ou une vidéo." }, { status: 400 });
  }
  if (message && message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Message trop long." }, { status: 400 });
  }
  if (message && containsAbusiveContent(message)) {
    return NextResponse.json({ error: "Ce message contient des termes non autorisés." }, { status: 400 });
  }

  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(ObFanWallItem);
  const item = repository.create({
    userId: auth.data.session.id,
    message,
    imageUrl,
    videoUrl,
    status: "PENDING",
  });
  await repository.save(item);

  return NextResponse.json({ success: true, item: { id: item.id, status: item.status } });
}
