import { getDataSource } from "@/lib/database";
import { ObQuiz } from "@/entities/ObQuiz";
import { ObQuizOption } from "@/entities/ObQuizOption";
import { ObQuizAnswer } from "@/entities/ObQuizAnswer";

export interface QuizOptionView {
  id: number;
  label: string;
}

export interface QuizView {
  id: number;
  question: string;
  options: QuizOptionView[];
  myAnswer: { optionId: number; correct: boolean } | null;
}

export class QuizService {
  async listOpenQuizzes(userId: string | null): Promise<QuizView[]> {
    const dataSource = await getDataSource();
    const quizzes = await dataSource
      .getRepository(ObQuiz)
      .find({ where: { status: "OPEN" }, order: { createdAt: "DESC" } });
    if (quizzes.length === 0) return [];

    const quizIds = quizzes.map((q) => q.id);
    const options = await dataSource
      .getRepository(ObQuizOption)
      .createQueryBuilder("o")
      .where("o.quiz_id IN (:...quizIds)", { quizIds })
      .orderBy("o.sort_order", "ASC")
      .getMany();

    let myAnswers = new Map<number, { optionId: number; correct: boolean }>();
    if (userId) {
      const answers = await dataSource
        .getRepository(ObQuizAnswer)
        .createQueryBuilder("a")
        .where("a.quiz_id IN (:...quizIds)", { quizIds })
        .andWhere("a.user_id = :userId", { userId })
        .getMany();
      myAnswers = new Map(answers.map((a) => [a.quizId, { optionId: a.optionId, correct: a.isCorrect }]));
    }

    return quizzes.map((quiz) => ({
      id: quiz.id,
      question: quiz.question,
      options: options.filter((o) => o.quizId === quiz.id).map((o) => ({ id: o.id, label: o.label })),
      myAnswer: myAnswers.get(quiz.id) ?? null,
    }));
  }
}
