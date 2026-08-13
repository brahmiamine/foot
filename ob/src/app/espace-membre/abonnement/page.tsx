import shared from "@/components/shared.module.css";
import { getLocalizedMetadata, getTranslator } from "@/i18n/server";

export const generateMetadata = () => getLocalizedMetadata("metadata.subscriptions");

// Même principe que espace-membre/billets : la billetterie est une app
// générique séparée (voir README racine § « Billetterie »), pas
// réimplémentée ici. billetterieUrl pointe vers son "mes-abonnements", où
// la session sso est revérifiée indépendamment.
export default async function SubscriptionPage() {
  const { t } = await getTranslator();
  const billetterieUrl = process.env.NEXT_PUBLIC_BILLETTERIE_URL || "http://localhost:3005";

  return (
    <div className={shared.card} style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>{t("member.subscriptions")}</h2>
      <p style={{ color: "var(--ob-text-muted)" }}>
        {t("member.subscriptionsInfo")}
      </p>
      <a href={`${billetterieUrl}/mes-abonnements`} className={shared.btnPrimary} style={{ marginTop: 8 }}>
        {t("member.viewSubscriptions")}
      </a>
    </div>
  );
}
