"use client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { SheetStatus } from "@/entities/Sheet";

const KEYS = { DRAFT: "draft", PRE_MATCH_SIGNED: "preSigned", IN_PROGRESS: "inProgress", POST_MATCH_SIGNED: "postSigned", CLOSED: "closed" } as const;

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
