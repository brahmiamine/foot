"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./PostComposer.module.css";

export function PostComposer() {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!body.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Publication impossible");

      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Partagez quelque chose avec les supporters de l'OB..."
        maxLength={2000}
        rows={3}
      />
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" disabled={loading || !body.trim()}>
        {loading ? "Publication..." : "Publier"}
      </button>
    </form>
  );
}
