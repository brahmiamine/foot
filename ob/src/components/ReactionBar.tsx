"use client";

import { useState } from "react";
import styles from "./ReactionBar.module.css";

export interface ReactionState {
  emoji: string;
  count: number;
  mine: boolean;
}

export function ReactionBar({
  targetType,
  targetId,
  initialReactions,
  loggedIn,
}: {
  targetType: "POST" | "NEWS" | "COMMENT";
  targetId: string;
  initialReactions: ReactionState[];
  loggedIn: boolean;
}) {
  const [reactions, setReactions] = useState(initialReactions);
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(emoji: string) {
    if (!loggedIn || pending) return;
    setPending(emoji);
    try {
      const response = await fetch("/api/community/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, emoji }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return;
      setReactions((prev) =>
        prev.map((r) => (r.emoji === emoji ? { ...r, count: payload.count, mine: payload.active } : r))
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={styles.bar}>
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          className={`${styles.pill} ${r.mine ? styles.active : ""}`}
          onClick={() => toggle(r.emoji)}
          disabled={!loggedIn || pending === r.emoji}
          title={loggedIn ? undefined : "Connectez-vous pour réagir"}
        >
          {r.emoji} {r.count}
        </button>
      ))}
    </div>
  );
}
