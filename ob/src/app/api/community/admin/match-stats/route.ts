import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/community/requireStaff";
import { MatchStatsService } from "@/services/MatchStatsService";

export const runtime = "nodejs";

const NUMERIC_FIELDS = [
  "possessionHome",
  "possessionAway",
  "shotsHome",
  "shotsAway",
  "shotsOnTargetHome",
  "shotsOnTargetAway",
  "cornersHome",
  "cornersAway",
  "foulsHome",
  "foulsAway",
] as const;

export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const matchId = typeof body.matchId === "string" ? body.matchId : "";
  if (!matchId) {
    return NextResponse.json({ error: "Match requis" }, { status: 400 });
  }

  const values = {} as Record<(typeof NUMERIC_FIELDS)[number], number | null>;
  for (const field of NUMERIC_FIELDS) {
    const raw = body[field];
    values[field] = raw === "" || raw == null ? null : Number(raw);
  }

  await new MatchStatsService().upsert({ matchId, ...values }, auth.session.id);

  return NextResponse.json({ success: true });
}
