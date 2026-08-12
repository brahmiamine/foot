import { getTranslator } from "@/i18n/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getTranslator();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #0b1f18 0%, #0d6e4f 55%, #0b1f18 100%)",
        padding: "1.5rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 0.75rem",
              borderRadius: 12,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: "#0d6e4f",
              fontSize: "1.1rem",
            }}
          >
            SP
          </div>
          <h1 style={{ color: "#fff", fontSize: "1.15rem", margin: 0, fontWeight: 700 }}>{t("app.metadata.title")}</h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.82rem", margin: "4px 0 0" }}>
            {t("app.brand.subtitle")}
          </p>
        </div>
        <div
          style={{
            background: "var(--sp-surface)",
            borderRadius: "var(--sp-radius-lg)",
            boxShadow: "var(--sp-shadow-md)",
            padding: "1.75rem",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
