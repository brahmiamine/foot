export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        textAlign: "center",
        padding: 32,
      }}
    >
      <h1 style={{ fontFamily: "var(--ob-font-display)", fontSize: 32, textTransform: "uppercase" }}>
        Page introuvable
      </h1>
      <p style={{ color: "var(--ob-text-muted)" }}>
        Le club Olympique de Béja n&apos;a pas encore été configuré sur ce site (OB_TEAM_ID manquant ou introuvable
        en base).
      </p>
    </div>
  );
}
