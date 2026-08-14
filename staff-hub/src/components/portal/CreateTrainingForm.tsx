"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { createTrainingAction } from "@/app/actions";
import { AGE_CATEGORIES, AGE_CATEGORY_LABELS, type AgeCategory } from "@/types/categories";

const TYPE_LABEL: Record<string, string> = {
  TECHNIQUE: "Technique",
  PHYSIQUE: "Physique",
  TACTIQUE: "Tactique",
  PREPARATION_MATCH: "Préparation match",
  RECUPERATION: "Récupération",
  AUTRE: "Autre",
};

export function CreateTrainingForm({ categories }: { categories: AgeCategory[] | "ALL" }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<AgeCategory>(categories === "ALL" ? "seniors" : categories[0] ?? "seniors");
  const [title, setTitle] = useState("");
  const [trainingType, setTrainingType] = useState("TECHNIQUE");
  const [date, setDate] = useState("");
  const [venueName, setVenueName] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const availableCategories = categories === "ALL" ? AGE_CATEGORIES : categories;

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        + Nouvel entraînement
      </Button>
    );
  }

  function submit() {
    if (!title || !date) return;
    startTransition(async () => {
      await createTrainingAction({ category, title, trainingType, date, venueName: venueName || undefined });
      setOpen(false);
      setTitle("");
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
        <FormField label="Titre" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Séance technique" />
        </FormField>
        <FormField label="Type">
          <Select value={trainingType} onChange={(e) => setTrainingType(e.target.value)}>
            {Object.entries(TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Date et heure" required>
          <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField label="Lieu">
          <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="Ex : Terrain d'entraînement" />
        </FormField>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button variant="primary" disabled={pending || !title || !date} onClick={submit}>
          {pending ? "…" : "Créer"}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
