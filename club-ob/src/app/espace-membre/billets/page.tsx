import shared from "@/components/shared.module.css";
import { getLocalizedMetadata, getTranslator } from "@/i18n/server";

export const generateMetadata = () => getLocalizedMetadata("metadata.tickets");

// La ticketing est une app générique séparée (voir README racine
// § « Billetterie »), pas réimplémentée ici — ce site reste en lecture
// seule sur la base partagée. ticketingUrl pointe vers son
// "mes-billets", où la session sso est revérifiée indépendamment.
export default async function BilletsPage() {
  const { t } = await getTranslator();
  const ticketingUrl = process.env.NEXT_PUBLIC_TICKETING_URL || "http://localhost:3005";

  return (
    <div className={shared.card} style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>{t("member.tickets")}</h2>
      <p style={{ color: "var(--ob-text-muted)" }}>
        {t("member.ticketsInfo")}
      </p>
      <a href={`${ticketingUrl}/mes-billets`} className={shared.btnPrimary} style={{ marginTop: 8 }}>
        {t("member.viewTickets")}
      </a>
    </div>
  );
}
