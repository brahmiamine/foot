"use client";

import { useEffect, useState } from "react";
import { formatMatchDateTime } from "@/lib/format";
import { CheckinButton } from "./CheckinButton";
import styles from "./MatchDayBanner.module.css";

interface MatchDayEvent {
  type: "GOAL" | "CARD" | "SUB";
  minute: number;
  period: string;
  teamId: string;
  label: string;
}

type MatchStatus = "UPCOMING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";

function useCountdown(target: Date) {
  const [remaining, setRemaining] = useState(() => Math.max(0, target.getTime() - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(Math.max(0, target.getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return { hours, minutes, seconds, done: remaining <= 0 };
}

export function MatchDayBanner({
  matchId,
  homeLabel,
  awayLabel,
  kickoff,
  stadiumLabel,
  initialStatus,
  initialScoreHome,
  initialScoreAway,
  initialEvents,
  loggedIn,
}: {
  matchId: string;
  homeLabel: string;
  awayLabel: string;
  kickoff: string;
  stadiumLabel: string | null;
  initialStatus: MatchStatus;
  initialScoreHome: number | null;
  initialScoreAway: number | null;
  initialEvents: MatchDayEvent[];
  loggedIn: boolean;
}) {
  const kickoffDate = new Date(kickoff);
  const [status, setStatus] = useState(initialStatus);
  const [scoreHome, setScoreHome] = useState(initialScoreHome);
  const [scoreAway, setScoreAway] = useState(initialScoreAway);
  const [events, setEvents] = useState(initialEvents);
  const countdown = useCountdown(kickoffDate);

  useEffect(() => {
    if (status === "FINISHED" || status === "CANCELLED") return;

    const poll = async () => {
      try {
        const response = await fetch(`/api/matchday/${matchId}`);
        if (!response.ok) return;
        const data = await response.json();
        setStatus(data.status);
        setScoreHome(data.scoreHome);
        setScoreAway(data.scoreAway);
        setEvents(data.events ?? []);
      } catch {
        // Poll suivant réessaiera.
      }
    };

    const interval = setInterval(poll, 20000);
    if (countdown.done) poll();
    return () => clearInterval(interval);
  }, [matchId, status, countdown.done]);

  return (
    <div className={styles.banner}>
      <div className={styles.inner}>
        <div className={styles.eyebrow}>
          {status === "IN_PROGRESS" && <span className={styles.liveDot} />}
          {status === "IN_PROGRESS" ? "En direct" : status === "FINISHED" ? "Fin du match" : "Match day"}
        </div>

        <div className={styles.teams}>
          <span>{homeLabel}</span>
          {status === "UPCOMING" ? (
            <span className={styles.vs}>VS</span>
          ) : (
            <span className={styles.score}>
              {scoreHome ?? 0} - {scoreAway ?? 0}
            </span>
          )}
          <span>{awayLabel}</span>
        </div>

        <div className={styles.meta}>
          {formatMatchDateTime(kickoffDate)}
          {stadiumLabel ? ` · ${stadiumLabel}` : ""}
        </div>

        {status === "UPCOMING" && !countdown.done && (
          <div className={styles.countdown}>
            ⏱️ Coup d&apos;envoi dans {countdown.hours}:{countdown.minutes}:{countdown.seconds}
          </div>
        )}

        {status === "IN_PROGRESS" && <CheckinButton matchId={matchId} loggedIn={loggedIn} />}

        {status !== "UPCOMING" && events.length > 0 && (
          <div className={styles.events}>
            {events.map((event, index) => (
              <div key={index} className={styles.event}>
                <span className={styles.eventMinute}>{event.minute}&apos;</span>
                <span>{event.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
