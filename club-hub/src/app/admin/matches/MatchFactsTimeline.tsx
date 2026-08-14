import type { MatchFact, MatchFactType } from "@/services/MatchFactsService";

const EVENT_ICONS: Record<MatchFactType, string> = {
  GOAL: "⚽",
  CARD: "🟨",
  SUBSTITUTION: "🔄",
  INJURY: "🩹",
};

const PERIOD_SUFFIX: Record<string, string> = {
  ET1: " (prol.)",
  ET2: " (prol.)",
};

/**
 * Fil chronologique des faits de match (buts, cartons, blessures,
 * remplacements) saisis dans la feuille de match électronique. Lecture
 * seule — voir services/MatchFactsService.ts.
 */
export function MatchFactsTimeline({ facts }: { facts: MatchFact[] }) {
  if (facts.length === 0) {
    return <p className="text-muted small mb-0">Aucun fait de match enregistré pour l&apos;instant.</p>;
  }

  return (
    <ul className="list-unstyled mb-0 d-flex flex-column gap-1">
      {facts.map((fact) => (
        <li key={fact.id} className="d-flex align-items-start gap-2 small">
          <span className="text-muted font-monospace" style={{ minWidth: "3.5rem" }}>
            {fact.minute != null ? `${fact.minute}'` : "—"}
            {fact.period ? PERIOD_SUFFIX[fact.period] ?? "" : ""}
          </span>
          <span>{EVENT_ICONS[fact.type]}</span>
          <span>
            {fact.label}
            {fact.detail && <span className="text-muted"> ({fact.detail})</span>}
            {fact.neutralized && <span className="badge bg-secondary-subtle text-secondary ms-1">neutralisé</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
