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
        background: "var(--sp-surface)",
        border: "1px solid var(--sp-border)",
        borderRadius: "var(--sp-radius-lg)",
        boxShadow: "var(--sp-shadow-sm)",
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
  tone?: "primary" | "warning" | "danger" | "neutral";
}) {
  const accent =
    tone === "primary"
      ? "var(--sp-primary)"
      : tone === "warning"
        ? "var(--sp-warning)"
        : tone === "danger"
          ? "var(--sp-danger)"
          : "var(--sp-text)";

  return (
    <Card>
      <div style={{ fontSize: "0.8rem", color: "var(--sp-text-muted)", fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: accent }}>{value}</div>
      {hint && <div style={{ fontSize: "0.78rem", color: "var(--sp-text-subtle)", marginTop: 4 }}>{hint}</div>}
    </Card>
  );
}
