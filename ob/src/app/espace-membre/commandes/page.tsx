import shared from "@/components/shared.module.css";
import { getTranslator } from "@/i18n/server";

export const metadata = {
  title: "Mes commandes — Espace membre — Olympique de Béja",
};

export default async function CommandesPage() {
  const { t } = await getTranslator();
  return (
    <div className={shared.card} style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>{t("member.orders")}</h2>
      <p style={{ color: "var(--ob-text-muted)" }}>
        {t("member.noOrders")}
      </p>
    </div>
  );
}
