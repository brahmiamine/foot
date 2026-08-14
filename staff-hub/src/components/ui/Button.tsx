import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const base: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: "1px solid transparent",
  borderRadius: "var(--sh-radius-sm)",
  padding: "0.55rem 1rem",
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.15s ease",
};

const variants: Record<Variant, React.CSSProperties> = {
  primary: { background: "var(--sh-primary)", color: "#fff" },
  secondary: { background: "var(--sh-surface)", color: "var(--sh-text)", borderColor: "var(--sh-border)" },
  danger: { background: "var(--sh-danger)", color: "#fff" },
  ghost: { background: "transparent", color: "var(--sh-primary)" },
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", style, disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        ...base,
        ...variants[variant],
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    />
  );
}
