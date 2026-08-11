"use client";

import { useState } from "react";
import styles from "./FollowToggle.module.css";

export function FollowToggle({
  targetType,
  targetId,
  label,
  initialFollowing,
}: {
  targetType: "TEAM" | "PLAYER";
  targetId: string;
  label: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/community/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setFollowing(payload.following);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`${styles.toggle} ${following ? styles.following : ""}`}
    >
      {following ? "✓ Suivi" : "+ Suivre"} {label}
    </button>
  );
}
