import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { ObReport, type ObReportTargetType } from "@/entities/ObReport";
import { requireMember } from "@/lib/community/requireMember";

export const runtime = "nodejs";

const TARGET_TYPES: ObReportTargetType[] = ["POST", "COMMENT", "FAN_WALL_ITEM"];
const MAX_REASON_LENGTH = 500;

export async function POST(request: NextRequest) {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const targetType = body.targetType as ObReportTargetType;
  const targetId = typeof body.targetId === "string" ? body.targetId : "";
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, MAX_REASON_LENGTH) : null;

  if (!TARGET_TYPES.includes(targetType) || !targetId) {
    return NextResponse.json({ error: "Signalement invalide" }, { status: 400 });
  }

  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(ObReport);

  const existing = await repository.findOne({
    where: { targetType, targetId, reportedBy: auth.data.session.id, status: "OPEN" },
  });
  if (existing) {
    return NextResponse.json({ success: true, alreadyReported: true });
  }

  await repository.save(
    repository.create({ targetType, targetId, reportedBy: auth.data.session.id, reason, status: "OPEN" })
  );

  return NextResponse.json({ success: true });
}
