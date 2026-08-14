"use client";

import type { ReactNode } from "react";
import { Card } from "./Card";
import { useI18n } from "@/i18n/provider";

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--sp-text-muted)" }}>
      <div
        style={{
          width: 28,
          height: 28,
          margin: "0 auto 0.75rem",
          border: "3px solid var(--sp-border)",
          borderTopColor: "var(--sp-primary)",
          borderRadius: "50%",
          animation: "sp-spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes sp-spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: "0.85rem" }}>{label ?? t("common.loading")}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <Card style={{ borderColor: "var(--sp-danger-soft)", background: "#fff8f8" }}>
      <p style={{ color: "var(--sp-danger)", fontWeight: 600, marginBottom: onRetry ? 8 : 0 }}>⚠ {message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: "none",
            border: "none",
            color: "var(--sp-primary)",
            fontWeight: 600,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {t("common.retry")}
        </button>
      )}
    </Card>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  useI18n();
  return (
    <div style={{ padding: "3rem 1rem", textAlign: "center" }}>
      <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 4 }}>{title}</p>
      {description && <p style={{ color: "var(--sp-text-muted)", fontSize: "0.85rem", marginBottom: 16 }}>{description}</p>}
      {action}
    </div>
  );
}
