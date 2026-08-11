import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/community/requireStaff";
import { createQuiz } from "@/lib/community/quiz";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const rawOptions = Array.isArray(body.options) ? body.options : [];
  const correctIndex = Number(body.correctIndex);

  const options: { label: string; isCorrect: boolean }[] = rawOptions
    .filter((o: unknown): o is string => typeof o === "string" && o.trim().length > 0)
    .map((label: string, index: number) => ({ label: label.trim(), isCorrect: index === correctIndex }));

  if (!question || options.length < 2 || !options.some((o) => o.isCorrect)) {
    return NextResponse.json(
      { error: "Question, au moins 2 options et une bonne réponse requises" },
      { status: 400 }
    );
  }

  const quiz = await createQuiz({ question, options, createdBy: auth.session.id });
  return NextResponse.json({ success: true, quizId: quiz.id });
}
