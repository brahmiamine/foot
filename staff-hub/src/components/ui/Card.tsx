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
        background: "var(--sh-surface)",
        border: "1px solid var(--sh-border)",
        borderRadius: "var(--sh-radius-lg)",
        boxShadow: "var(--sh-shadow-sm)",
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
      ? "var(--sh-primary)"
      : tone === "warning"
        ? "var(--sh-warning)"
        : tone === "danger"
          ? "var(--sh-danger)"
          : tone === "success"
            ? "var(--sh-success)"
            : "var(--sh-text)";

  return (
    <Card>
      <div style={{ fontSize: "0.8rem", color: "var(--sh-text-muted)", fontWeight: 600, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: accent }}>{value}</div>
      {hint && <div style={{ fontSize: "0.78rem", color: "var(--sh-text-subtle)", marginTop: 4 }}>{hint}</div>}
    </Card>
  );
}
