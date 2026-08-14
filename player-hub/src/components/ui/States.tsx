"use client";

import type { ReactNode } from "react";
import { Card } from "./Card";

export function LoadingState({ label }: { label?: string }) {
  return (
    <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--ph-text-muted)" }}>
      <div
        style={{
          width: 28,
          height: 28,
          margin: "0 auto 0.75rem",
          border: "3px solid var(--ph-border)",
          borderTopColor: "var(--ph-primary)",
          borderRadius: "50%",
          animation: "ph-spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes ph-spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: "0.85rem" }}>{label ?? "Chargement…"}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={{ borderColor: "var(--ph-danger-soft)", background: "#fff8f8" }}>
      <p style={{ color: "var(--ph-danger)", fontWeight: 600, marginBottom: onRetry ? 8 : 0 }}>⚠ {message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{ background: "none", border: "none", color: "var(--ph-primary)", fontWeight: 600, cursor: "pointer", padding: 0 }}
        >
          Réessayer
        </button>
      )}
    </Card>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div style={{ padding: "3rem 1rem", textAlign: "center" }}>
      <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 4 }}>{title}</p>
      {description && <p style={{ color: "var(--ph-text-muted)", fontSize: "0.85rem", marginBottom: 16 }}>{description}</p>}
      {action}
    </div>
  );
}
