import shared from "@/components/shared.module.css";
import { getTranslator } from "@/i18n/server";

export const metadata = {
  title: "Mes billets — Espace membre — Olympique de Béja",
};

// La billetterie est une app générique séparée (voir README racine
// § « Billetterie »), pas réimplémentée ici — ce site reste en lecture
// seule sur la base partagée. billetterieUrl pointe vers son
// "mes-billets", où la session sso est revérifiée indépendamment.
export default async function BilletsPage() {
  const { t } = await getTranslator();
  const billetterieUrl = process.env.NEXT_PUBLIC_BILLETTERIE_URL || "http://localhost:3005";

  return (
    <div className={shared.card} style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>{t("member.tickets")}</h2>
      <p style={{ color: "var(--ob-text-muted)" }}>
        {t("member.ticketsInfo")}
      </p>
      <a href={`${billetterieUrl}/mes-billets`} className={shared.btnPrimary} style={{ marginTop: 8 }}>
        {t("member.viewTickets")}
      </a>
    </div>
  );
}
