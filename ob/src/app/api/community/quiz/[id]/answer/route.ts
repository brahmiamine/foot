import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/community/requireMember";
import { submitQuizAnswer } from "@/lib/community/quiz";

export const runtime = "nodejs";

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "Quiz introuvable.",
  closed: "Ce quiz est clos.",
  already_answered: "Vous avez déjà répondu.",
  invalid_option: "Option invalide.",
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const quizId = Number(id);
  const body = await request.json().catch(() => ({}));
  const optionId = Number(body.optionId);

  if (!Number.isInteger(quizId) || !Number.isInteger(optionId)) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const result = await submitQuizAnswer(auth.data.session.id, quizId, optionId);
  if (!result.ok) {
    return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 });
  }

  return NextResponse.json({ success: true, correct: result.correct });
}
