const toneStyles: Record<string, { bg: string; fg: string }> = {
  neutral: { bg: "#f1f5f9", fg: "#475569" },
  success: { bg: "#dcfce7", fg: "#166534" },
  warning: { bg: "#fef3c7", fg: "#92400e" },
  danger: { bg: "#fee2e2", fg: "#991b1b" },
  info: { bg: "#dbeafe", fg: "#1e40af" },
};

export function Badge({ label, tone = "neutral" }: { label: string; tone?: keyof typeof toneStyles }) {
  const s = toneStyles[tone] ?? toneStyles.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: "0.76rem",
        fontWeight: 600,
        background: s.bg,
        color: s.fg,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
