"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { addDocumentAction } from "@/app/actions";

export function AddDocumentForm({ injuryId }: { injuryId: number }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!name.trim() || !url.trim()) return;
    startTransition(async () => {
      await addDocumentAction(injuryId, name.trim(), url.trim());
      setName("");
      setUrl("");
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du document (ex : Radio genou)" style={{ width: 220 }} />
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" style={{ width: 220 }} />
      <Button variant="secondary" disabled={pending || !name.trim() || !url.trim()} onClick={submit} style={{ padding: "0.45rem 0.8rem", fontSize: "0.82rem" }}>
        {pending ? "…" : "Ajouter"}
      </Button>
    </div>
  );
}
