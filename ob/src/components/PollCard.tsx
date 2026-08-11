"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./PollCard.module.css";

export interface PollOptionView {
  id: number;
  label: string;
  votes: number;
}

const TYPE_LABELS: Record<string, string> = {
  POLL: "Sondage",
  MOTM: "Homme du match",
  PLAYER_OF_MONTH: "Joueur du mois",
  GOAL_OF_MONTH: "But du mois",
};

export function PollCard({
  pollId,
  type,
  question,
  options,
  totalVotes,
  myVoteOptionId,
  loggedIn,
}: {
  pollId: number;
  type: string;
  question: string;
  options: PollOptionView[];
  totalVotes: number;
  myVoteOptionId: number | null;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [voted, setVoted] = useState(myVoteOptionId);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function vote(optionId: number) {
    if (!loggedIn || voted || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/community/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Vote impossible");
      setVoted(optionId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setPending(false);
    }
  }

  const showResults = voted !== null;

  return (
    <div className={styles.card}>
      <div className={styles.eyebrow}>{TYPE_LABELS[type] ?? "Sondage"}</div>
      <h3>{question}</h3>
      <div className={styles.options}>
        {options.map((option) => {
          const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          return (
            <button
              key={option.id}
              type="button"
              className={`${styles.option} ${voted === option.id ? styles.chosen : ""}`}
              onClick={() => vote(option.id)}
              disabled={!loggedIn || voted !== null || pending}
              style={showResults ? { backgroundSize: `${pct}% 100%` } : undefined}
            >
              <span>{option.label}</span>
              {showResults && (
                <span className={styles.pct}>
                  {pct}% ({option.votes})
                </span>
              )}
            </button>
          );
        })}
      </div>
      {!loggedIn && <p className={styles.muted}>Connectez-vous pour voter.</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
