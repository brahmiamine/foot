"use client";

import { FormEvent, useState } from "react";
import styles from "./FanWallForm.module.css";

export function FanWallForm() {
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!message.trim() && !imageUrl.trim() && !videoUrl.trim()) {
      setError("Ajoutez un message, une photo ou une vidéo.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/community/fan-wall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Envoi impossible");

      setSuccess(true);
      setMessage("");
      setImageUrl("");
      setVideoUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Un message d'encouragement pour l'OB..."
        maxLength={500}
        rows={3}
      />
      <input
        type="url"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="Lien vers une photo (optionnel)"
      />
      <input
        type="url"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        placeholder="Lien vers une vidéo (optionnel)"
      />
      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>Envoyé ! Votre contribution apparaîtra après validation.</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Envoi..." : "Envoyer à la tribune"}
      </button>
    </form>
  );
}
