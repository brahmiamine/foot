"use client";

import { useState } from "react";
import styles from "./PollCard.module.css";

export function QuizCard({
  quizId,
  question,
  options,
  myAnswer,
  loggedIn,
}: {
  quizId: number;
  question: string;
  options: { id: number; label: string }[];
  myAnswer: { optionId: number; correct: boolean } | null;
  loggedIn: boolean;
}) {
  const [answer, setAnswer] = useState(myAnswer);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function answerQuiz(optionId: number) {
    if (!loggedIn || answer || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/community/quiz/${quizId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Réponse impossible");
      setAnswer({ optionId, correct: payload.correct });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.eyebrow}>Quiz OB — +20 points</div>
      <h3>{question}</h3>
      <div className={styles.options}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`${styles.option} ${answer?.optionId === option.id ? styles.chosen : ""}`}
            onClick={() => answerQuiz(option.id)}
            disabled={!loggedIn || !!answer || pending}
          >
            <span>{option.label}</span>
          </button>
        ))}
      </div>
      {answer && (
        <p className={answer.correct ? styles.pct : styles.muted}>
          {answer.correct ? "🎉 Bonne réponse !" : "Réponse enregistrée."} +20 points
        </p>
      )}
      {!loggedIn && <p className={styles.muted}>Connectez-vous pour participer.</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
