"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { createTripAction } from "@/app/actions";
import { AGE_CATEGORIES, AGE_CATEGORY_LABELS, type AgeCategory } from "@/types/categories";

export function CreateTripForm({ categories }: { categories: AgeCategory[] | "ALL" }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<AgeCategory>(categories === "ALL" ? "seniors" : categories[0] ?? "seniors");
  const [departureTime, setDepartureTime] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const availableCategories = categories === "ALL" ? AGE_CATEGORIES : categories;

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        + Nouveau déplacement
      </Button>
    );
  }

  function submit() {
    if (!departureTime) return;
    startTransition(async () => {
      await createTripAction({ category, departureTime, meetingPoint: meetingPoint || undefined });
      setOpen(false);
      setDepartureTime("");
      setMeetingPoint("");
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
        <FormField label="Départ" required>
          <Input type="datetime-local" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
        </FormField>
        <FormField label="Point de rendez-vous">
          <Input value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} />
        </FormField>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button variant="primary" disabled={pending || !departureTime} onClick={submit}>
          {pending ? "…" : "Créer"}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
