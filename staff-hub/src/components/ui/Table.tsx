import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.87rem" }}>{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr style={{ textAlign: "left", borderBottom: "1px solid var(--sh-border)" }}>{children}</tr>
    </thead>
  );
}

export function Th({ children }: { children?: ReactNode }) {
  return (
    <th
      style={{
        padding: "0.65rem 0.9rem",
        fontSize: "0.72rem",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color: "var(--sh-text-muted)",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

export function Td({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: "0.75rem 0.9rem", borderBottom: "1px solid var(--sh-border)", verticalAlign: "middle", ...style }}>
      {children}
    </td>
  );
}

export function Tr({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      {children}
    </tr>
  );
}
