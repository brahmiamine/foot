import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/community/requireMember";
import { voteOnPoll } from "@/lib/community/polls";

export const runtime = "nodejs";

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "Sondage introuvable.",
  closed: "Ce sondage est clos.",
  already_voted: "Vous avez déjà voté.",
  invalid_option: "Option invalide.",
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const pollId = Number(id);
  const body = await request.json().catch(() => ({}));
  const optionId = Number(body.optionId);

  if (!Number.isInteger(pollId) || !Number.isInteger(optionId)) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const result = await voteOnPoll(auth.data.session.id, pollId, optionId);
  if (!result.ok) {
    return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
