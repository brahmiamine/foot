import { getTranslator } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getTranslator();
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
        {t("notFound.title")}
      </h1>
      <p style={{ color: "var(--ob-text-muted)" }}>
        {t("notFound.message")}
      </p>
    </div>
  );
}
