import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/community/requireStaff";
import {
  hidePost,
  hideComment,
  setUserBlocked,
  reviewFanWallItem,
  resolveReport,
} from "@/lib/community/moderation";

export const runtime = "nodejs";

const ACTIONS = [
  "HIDE_POST",
  "HIDE_COMMENT",
  "BLOCK_USER",
  "UNBLOCK_USER",
  "APPROVE_FAN_WALL",
  "REJECT_FAN_WALL",
  "RESOLVE_REPORT",
  "DISMISS_REPORT",
] as const;
type Action = (typeof ACTIONS)[number];

export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const action = body.action as Action;
  const targetId = body.targetId;
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : undefined;

  if (!ACTIONS.includes(action) || (typeof targetId !== "string" && typeof targetId !== "number")) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const actorId = auth.session.id;
  let ok = false;

  switch (action) {
    case "HIDE_POST":
      ok = await hidePost(actorId, Number(targetId), reason);
      break;
    case "HIDE_COMMENT":
      ok = await hideComment(actorId, Number(targetId), reason);
      break;
    case "BLOCK_USER":
      ok = await setUserBlocked(actorId, String(targetId), true, reason);
      break;
    case "UNBLOCK_USER":
      ok = await setUserBlocked(actorId, String(targetId), false, reason);
      break;
    case "APPROVE_FAN_WALL":
      ok = await reviewFanWallItem(actorId, Number(targetId), true, reason);
      break;
    case "REJECT_FAN_WALL":
      ok = await reviewFanWallItem(actorId, Number(targetId), false, reason);
      break;
    case "RESOLVE_REPORT":
      ok = await resolveReport(actorId, Number(targetId), true, reason);
      break;
    case "DISMISS_REPORT":
      ok = await resolveReport(actorId, Number(targetId), false, reason);
      break;
  }

  if (!ok) {
    return NextResponse.json({ error: "Cible introuvable" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
