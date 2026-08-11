import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { ObComment, type ObCommentTargetType } from "@/entities/ObComment";
import { requireMember } from "@/lib/community/requireMember";
import { CommunityFeedService } from "@/services/CommunityFeedService";
import { containsAbusiveContent } from "@/lib/community/abuseFilter";

export const runtime = "nodejs";

const MAX_BODY_LENGTH = 1000;
const TARGET_TYPES: ObCommentTargetType[] = ["POST", "NEWS"];

export async function GET(request: NextRequest) {
  const targetType = request.nextUrl.searchParams.get("targetType") as ObCommentTargetType;
  const targetId = request.nextUrl.searchParams.get("targetId") ?? "";

  if (!TARGET_TYPES.includes(targetType) || !targetId) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const comments = await new CommunityFeedService().listComments(targetType, targetId);
  return NextResponse.json({ comments });
}

export async function POST(request: NextRequest) {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const targetType = body.targetType as ObCommentTargetType;
  const targetId = typeof body.targetId === "string" ? body.targetId : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";

  if (!TARGET_TYPES.includes(targetType) || !targetId || !text || text.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: "Commentaire invalide" }, { status: 400 });
  }
  if (containsAbusiveContent(text)) {
    return NextResponse.json({ error: "Ce commentaire contient des termes non autorisés." }, { status: 400 });
  }

  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(ObComment);
  const comment = repository.create({
    targetType,
    targetId,
    userId: auth.data.session.id,
    body: text,
    status: "PUBLISHED",
  });
  await repository.save(comment);

  return NextResponse.json({
    success: true,
    comment: { id: comment.id, body: comment.body, createdAt: comment.createdAt },
  });
}
