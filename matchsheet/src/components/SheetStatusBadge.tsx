import type { SheetStatus } from "@/entities/Sheet";

const LABELS: Record<SheetStatus, string> = {
  DRAFT: "Brouillon",
  PRE_MATCH_SIGNED: "Avant-match signé",
  IN_PROGRESS: "Match en cours",
  POST_MATCH_SIGNED: "Après-match signé",
  CLOSED: "Feuille clôturée",
};

const BADGES: Record<SheetStatus, string> = {
  DRAFT: "bg-secondary-subtle text-secondary",
  PRE_MATCH_SIGNED: "bg-info-subtle text-info",
  IN_PROGRESS: "bg-primary-subtle text-primary",
  POST_MATCH_SIGNED: "bg-warning-subtle text-warning",
  CLOSED: "bg-success-subtle text-success",
};

export function SheetStatusBadge({ status }: { status: SheetStatus }) {
  return <span className={`badge ${BADGES[status]}`}>{LABELS[status]}</span>;
}
