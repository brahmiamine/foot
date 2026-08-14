import type { CSSProperties, ReactNode } from "react";

export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: CSSProperties;
  padded?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--ph-surface)",
        border: "1px solid var(--ph-border)",
        borderRadius: "var(--ph-radius-lg)",
        boxShadow: "var(--ph-shadow-sm)",
        padding: padded ? "1.25rem" : 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "primary" | "warning" | "danger" | "success" | "neutral";
}) {
  const accent =
    tone === "primary"
      ? "var(--ph-primary)"
      : tone === "warning"
        ? "var(--ph-warning)"
        : tone === "danger"
          ? "var(--ph-danger)"
          : tone === "success"
            ? "var(--ph-success)"
            : "var(--ph-text)";

  return (
    <Card>
      <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: accent }}>{value}</div>
      {hint && <div style={{ fontSize: "0.78rem", color: "var(--ph-text-subtle)", marginTop: 4 }}>{hint}</div>}
    </Card>
  );
}
