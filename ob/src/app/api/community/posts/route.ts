import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { ObPost } from "@/entities/ObPost";
import { requireMember } from "@/lib/community/requireMember";

export const runtime = "nodejs";

const MAX_BODY_LENGTH = 2000;

export async function POST(request: NextRequest) {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const imageUrl = typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null;

  if (!text || text.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: "Message invalide" }, { status: 400 });
  }

  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(ObPost);
  const post = repository.create({ userId: auth.data.session.id, body: text, imageUrl, status: "PUBLISHED" });
  await repository.save(post);

  return NextResponse.json({ success: true, post: { id: post.id, body: post.body, createdAt: post.createdAt } });
}
