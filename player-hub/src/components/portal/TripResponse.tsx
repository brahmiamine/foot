"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { respondTripAction } from "@/app/actions";
import type { TripTransportOffer } from "@/entities/TripParticipant";

const LABELS: Record<TripTransportOffer, string> = {
  NONE: "Pas de besoin particulier",
  NEEDS_TRANSPORT: "J'ai besoin d'un transport",
  CAN_DRIVE: "Je peux transporter d'autres joueurs",
};

export function TripResponseForm({
  participantId,
  current,
  currentSeats,
}: {
  participantId: number;
  current: TripTransportOffer;
  currentSeats: number | null;
}) {
  const [offer, setOffer] = useState<TripTransportOffer>(current);
  const [seats, setSeats] = useState(currentSeats ?? 1);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      await respondTripAction(participantId, offer, offer === "CAN_DRIVE" ? seats : null);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <Select value={offer} onChange={(e) => setOffer(e.target.value as TripTransportOffer)} style={{ width: "auto" }}>
        {(Object.keys(LABELS) as TripTransportOffer[]).map((value) => (
          <option key={value} value={value}>
            {LABELS[value]}
          </option>
        ))}
      </Select>
      {offer === "CAN_DRIVE" && (
        <input
          type="number"
          min={1}
          max={8}
          value={seats}
          onChange={(e) => setSeats(Number(e.target.value))}
          style={{ width: 64, padding: "0.5rem", border: "1px solid var(--ph-border)", borderRadius: "var(--ph-radius-sm)" }}
          aria-label="Places disponibles"
        />
      )}
      <Button variant="primary" disabled={pending} onClick={submit} style={{ padding: "0.5rem 0.9rem" }}>
        {pending ? "…" : "Valider"}
      </Button>
    </div>
  );
}
