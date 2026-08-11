import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/community/requireStaff";
import { createPoll } from "@/lib/community/polls";
import type { ObPollType } from "@/entities/ObPoll";

export const runtime = "nodejs";

const POLL_TYPES: ObPollType[] = ["POLL", "MOTM", "PLAYER_OF_MONTH", "GOAL_OF_MONTH"];

export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const type = POLL_TYPES.includes(body.type) ? (body.type as ObPollType) : "POLL";
  const matchId = typeof body.matchId === "string" && body.matchId ? body.matchId : null;
  const closesAt = typeof body.closesAt === "string" && body.closesAt ? new Date(body.closesAt) : null;
  const options = Array.isArray(body.options)
    ? body.options.filter((o: unknown): o is string => typeof o === "string" && o.trim().length > 0).map((o: string) => o.trim())
    : [];

  if (!question || options.length < 2) {
    return NextResponse.json({ error: "Question et au moins 2 options requises" }, { status: 400 });
  }

  const poll = await createPoll({
    question,
    type,
    matchId,
    closesAt,
    options,
    createdBy: auth.session.id,
  });

  return NextResponse.json({ success: true, pollId: poll.id });
}
