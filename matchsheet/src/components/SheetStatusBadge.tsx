"use client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { SheetStatus } from "@/entities/Sheet";

const KEYS = { DRAFT: "sheet.status.draft", PRE_MATCH_SIGNED: "sheet.status.preSigned", IN_PROGRESS: "sheet.status.inProgress", POST_MATCH_SIGNED: "sheet.status.postSigned", CLOSED: "sheet.status.closed" } as const;

const BADGES: Record<SheetStatus, string> = {
  DRAFT: "bg-secondary-subtle text-secondary",
  PRE_MATCH_SIGNED: "bg-info-subtle text-info",
  IN_PROGRESS: "bg-primary-subtle text-primary",
  POST_MATCH_SIGNED: "bg-warning-subtle text-warning",
  CLOSED: "bg-success-subtle text-success",
};

export function SheetStatusBadge({ status }: { status: SheetStatus }) {
  const { t } = useLanguage();
  return <span className={`badge ${BADGES[status]}`}>{t(KEYS[status])}</span>;
}
