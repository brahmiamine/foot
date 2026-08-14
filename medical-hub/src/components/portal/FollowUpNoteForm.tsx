"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { appendFollowUpNoteAction } from "@/app/actions";

export function FollowUpNoteForm({ injuryId }: { injuryId: number }) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!note.trim()) return;
    startTransition(async () => {
      await appendFollowUpNoteAction(injuryId, note.trim());
      setNote("");
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Ex : Séance de kiné, douleur en baisse, reprise course légère prévue demain..." />
      <div>
        <Button variant="primary" disabled={pending || !note.trim()} onClick={submit} style={{ padding: "0.45rem 0.8rem", fontSize: "0.82rem" }}>
          {pending ? "…" : "Ajouter au suivi"}
        </Button>
      </div>
    </div>
  );
}
