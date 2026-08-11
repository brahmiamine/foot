"use client";

import { FormEvent, useState } from "react";
import { ReportButton } from "./ReportButton";
import styles from "./CommentSection.module.css";

interface CommentView {
  id: number;
  authorName: string;
  body: string;
  createdAt: string;
}

export function CommentSection({
  targetType,
  targetId,
  commentCount,
  loggedIn,
}: {
  targetType: "POST" | "NEWS";
  targetId: string;
  commentCount: number;
  loggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<CommentView[] | null>(null);
  const [count, setCount] = useState(commentCount);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (comments) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/community/comments?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`
      );
      const payload = await response.json().catch(() => ({ comments: [] }));
      const loaded = payload.comments ?? [];
      setComments(loaded);
      setCount(loaded.length);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpen() {
    setOpen((prev) => !prev);
    if (!open) await load();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!text.trim()) return;

    try {
      const response = await fetch("/api/community/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, body: text.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Erreur");

      setComments((prev) => [
        ...(prev ?? []),
        { id: payload.comment.id, authorName: "Vous", body: payload.comment.body, createdAt: payload.comment.createdAt },
      ]);
      setCount((c) => c + 1);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.toggle} onClick={handleOpen}>
        💬 {count} commentaire{count > 1 ? "s" : ""}
      </button>

      {open && (
        <div className={styles.panel}>
          {loading && <p>Chargement...</p>}
          {comments?.map((c) => (
            <div key={c.id} className={styles.comment}>
              <strong>{c.authorName}</strong>
              <ReportButton targetType="COMMENT" targetId={c.id} loggedIn={loggedIn} />
              <p>{c.body}</p>
            </div>
          ))}

          {loggedIn ? (
            <form onSubmit={handleSubmit} className={styles.form}>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Votre commentaire..."
                maxLength={1000}
              />
              <button type="submit">Envoyer</button>
            </form>
          ) : (
            <p className={styles.muted}>Connectez-vous pour commenter.</p>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}
    </div>
  );
}
