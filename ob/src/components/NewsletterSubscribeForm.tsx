"use client";

import { FormEvent, useState } from "react";
import styles from "./NewsletterSubscribeForm.module.css";

export function NewsletterSubscribeForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(response.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return <p className={styles.done}>Merci ! Vous êtes inscrit à OB News.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="email"
        required
        placeholder="votre@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" disabled={state === "loading"}>
        {state === "loading" ? "..." : "S'abonner"}
      </button>
      {state === "error" && <p className={styles.error}>Erreur, réessayez.</p>}
    </form>
  );
}
