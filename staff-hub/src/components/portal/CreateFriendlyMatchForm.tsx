"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { createFriendlyMatchAction } from "@/app/actions";
import { AGE_CATEGORIES, AGE_CATEGORY_LABELS, type AgeCategory } from "@/types/categories";

export function CreateFriendlyMatchForm({ categories }: { categories: AgeCategory[] | "ALL" }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<AgeCategory>(categories === "ALL" ? "seniors" : categories[0] ?? "seniors");
  const [opponentName, setOpponentName] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [venueName, setVenueName] = useState("");
  const [date, setDate] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const availableCategories = categories === "ALL" ? AGE_CATEGORIES : categories;

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        + Match amical
      </Button>
    );
  }

  function submit() {
    if (!opponentName || !date) return;
    startTransition(async () => {
      await createFriendlyMatchAction({ category, opponentName, isHome, venueName: venueName || undefined, date });
      setOpen(false);
      setOpponentName("");
      setDate("");
      setVenueName("");
      router.refresh();
    });
  }

  return (
    <div style={{ border: "1px solid var(--sh-border)", borderRadius: "var(--sh-radius-lg)", padding: "1.25rem", background: "var(--sh-surface)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <FormField label="Catégorie">
          <Select value={category} onChange={(e) => setCategory(e.target.value as AgeCategory)}>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {AGE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Adversaire" required>
          <Input value={opponentName} onChange={(e) => setOpponentName(e.target.value)} />
        </FormField>
        <FormField label="Domicile / extérieur">
          <Select value={isHome ? "home" : "away"} onChange={(e) => setIsHome(e.target.value === "home")}>
            <option value="home">Domicile</option>
            <option value="away">Extérieur</option>
          </Select>
        </FormField>
        <FormField label="Date et heure" required>
          <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField label="Lieu">
          <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} />
        </FormField>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button variant="primary" disabled={pending || !opponentName || !date} onClick={submit}>
          {pending ? "…" : "Créer"}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
