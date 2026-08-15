export function LicenseFooter({ federationCode, digitalCardLabel, realtimeStatusLabel, isRtl }: { federationCode: string; digitalCardLabel: string; realtimeStatusLabel: string; isRtl: boolean; }) {
  return <div style={{ minHeight: 70, background: "linear-gradient(100deg, #d90012, #ef0718)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 24px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", color: "#e30613", fontSize: 18, fontWeight: 900 }}>★</div><div><div style={{ fontSize: 12, fontWeight: 800 }}>{federationCode}</div><div style={{ fontSize: 10, opacity: .9 }}>{digitalCardLabel}</div></div></div>
    <div style={{ fontSize: 10, opacity: .85, textAlign: isRtl ? "left" : "right", maxWidth: 160 }}>{realtimeStatusLabel}</div>
  </div>;
}
