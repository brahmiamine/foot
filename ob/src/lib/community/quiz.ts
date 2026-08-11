import { getDataSource } from "@/lib/database";
import { ObQuiz } from "@/entities/ObQuiz";
import { ObQuizOption } from "@/entities/ObQuizOption";
import { ObQuizAnswer } from "@/entities/ObQuizAnswer";
import { awardPoints } from "@/lib/community/points";

export type QuizAnswerResult =
  | { ok: true; correct: boolean }
  | { ok: false; error: "not_found" | "closed" | "already_answered" | "invalid_option" };

/** Quiz (#28, +20 points pour toute réponse, correcte ou non — même barème que "Vote"). */
export async function submitQuizAnswer(userId: string, quizId: number, optionId: number): Promise<QuizAnswerResult> {
  const dataSource = await getDataSource();
  const quiz = await dataSource.getRepository(ObQuiz).findOne({ where: { id: quizId } });
  if (!quiz) return { ok: false, error: "not_found" };
  if (quiz.status !== "OPEN") return { ok: false, error: "closed" };

  const option = await dataSource.getRepository(ObQuizOption).findOne({ where: { id: optionId, quizId } });
  if (!option) return { ok: false, error: "invalid_option" };

  const answerRepository = dataSource.getRepository(ObQuizAnswer);
  const existing = await answerRepository.findOne({ where: { quizId, userId } });
  if (existing) return { ok: false, error: "already_answered" };

  await answerRepository.save(
    answerRepository.create({ quizId, optionId, userId, isCorrect: option.isCorrect })
  );
  await awardPoints(userId, 20, "QUIZ", { type: "QUIZ", id: String(quizId) });

  return { ok: true, correct: option.isCorrect };
}

export interface CreateQuizInput {
  question: string;
  options: { label: string; isCorrect: boolean }[];
  createdBy: string;
}

export async function createQuiz(input: CreateQuizInput): Promise<ObQuiz> {
  const dataSource = await getDataSource();
  return dataSource.transaction(async (manager) => {
    const quiz = manager.getRepository(ObQuiz).create({ question: input.question, createdBy: input.createdBy });
    await manager.getRepository(ObQuiz).save(quiz);

    const options = input.options.map((o, index) =>
      manager.getRepository(ObQuizOption).create({
        quizId: quiz.id,
        label: o.label,
        isCorrect: o.isCorrect,
        sortOrder: index,
      })
    );
    await manager.getRepository(ObQuizOption).save(options);

    return quiz;
  });
}
