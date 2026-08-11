"use client";

import { FormEvent, useState } from "react";
import styles from "./PredictionWidget.module.css";

export function PredictionWidget({
  matchId,
  homeLabel,
  awayLabel,
  initialScoreHome,
  initialScoreAway,
  loggedIn,
}: {
  matchId: string;
  homeLabel: string;
  awayLabel: string;
  initialScoreHome: number | null;
  initialScoreAway: number | null;
  loggedIn: boolean;
}) {
  const [scoreHome, setScoreHome] = useState(initialScoreHome ?? 0);
  const [scoreAway, setScoreAway] = useState(initialScoreAway ?? 0);
  const [saved, setSaved] = useState(initialScoreHome !== null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/community/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, scoreHome, scoreAway }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Pronostic impossible");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.eyebrow}>Pronostic</div>
      <div className={styles.teams}>
        <span>{homeLabel}</span>
        <span className={styles.vs}>VS</span>
        <span>{awayLabel}</span>
      </div>

      {loggedIn ? (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.scores}>
            <input
              type="number"
              min={0}
              max={20}
              value={scoreHome}
              onChange={(e) => setScoreHome(Number(e.target.value))}
            />
            <span>-</span>
            <input
              type="number"
              min={0}
              max={20}
              value={scoreAway}
              onChange={(e) => setScoreAway(Number(e.target.value))}
            />
          </div>
          <button type="submit" disabled={loading}>
            {saved ? "Modifier" : "Valider"}
          </button>
          {saved && <p className={styles.confirm}>Pronostic enregistré : {scoreHome} - {scoreAway}</p>}
          {error && <p className={styles.error}>{error}</p>}
        </form>
      ) : (
        <p className={styles.muted}>Connectez-vous pour pronostiquer ce match.</p>
      )}
    </div>
  );
}
