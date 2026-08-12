"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveEvent, LiveEventType } from "@/services/LiveMatchService";
import styles from "./LiveMatchSection.module.css";
import { useI18n } from "@/i18n/I18nProvider";

const EVENT_ICONS: Record<LiveEventType, string> = {
  GOAL: "⚽",
  CARD: "🟨",
  SUBSTITUTION: "🔄",
  INJURY: "🩹",
};

const PERIOD_LABELS: Record<string, string> = {
  H1: "",
  H2: "",
  ET1: " (prol.)",
  ET2: " (prol.)",
};

interface LivePayload {
  status: "UPCOMING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";
  score: { home: number; away: number };
  events: LiveEvent[];
}

const POLL_INTERVAL_MS = 20_000;

export function LiveMatchSection({
  matchId,
  homeTeamName,
  awayTeamName,
  initialStatus,
  initialScore,
  initialEvents,
}: {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  initialStatus: LivePayload["status"];
  initialScore: { home: number; away: number };
  initialEvents: LiveEvent[];
}) {
  const { t } = useI18n();
  const [data, setData] = useState<LivePayload>({ status: initialStatus, score: initialScore, events: initialEvents });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (data.status !== "IN_PROGRESS") return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/live/${matchId}`, { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as LivePayload;
        setData(payload);
      } catch {
        // Connexion instable : on retentera au prochain intervalle, sans casser l'affichage courant.
      }
    };

    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [matchId, data.status]);

  const isLive = data.status === "IN_PROGRESS";

  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <div className={styles.label}>
          {isLive ? (
            <>
              <span className={styles.dot} /> {t("live.now")}
            </>
          ) : (
            t("live.finished")
          )}
        </div>

        <div className={styles.scoreboard}>
          <div className={styles.teamName}>{homeTeamName}</div>
          <div className={styles.score}>
            {data.score.home} – {data.score.away}
          </div>
          <div className={styles.teamName}>{awayTeamName}</div>
        </div>

        <div className={styles.events}>
          {data.events.length === 0 ? (
            <div className={styles.empty}>{t("live.empty")}</div>
          ) : (
            [...data.events].reverse().map((event) => (
              <div key={event.id} className={styles.event}>
                <span className={styles.minute}>
                  {event.minute != null ? `${event.minute}'` : "—"}
                  {event.period ? PERIOD_LABELS[event.period] : ""}
                </span>
                <span className={styles.icon}>{EVENT_ICONS[event.type]}</span>
                <span>{event.label}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
