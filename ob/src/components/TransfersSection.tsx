import type { PublicTransfer } from "@/services/PublicTransferService";
import shared from "./shared.module.css";
import styles from "./TransfersSection.module.css";
import { getTranslator } from "@/i18n/server";
import { localized } from "@/i18n/localized";
import { formatShortDate } from "@/lib/format";

export async function TransfersSection({ transfers }: { transfers: PublicTransfer[] }) {
  const { locale, t } = await getTranslator();

  if (transfers.length === 0) {
    return null;
  }

  return (
    <div id="transferts" className={shared.sectionPad}>
      <div className={shared.container}>
        <h2 className={shared.sectionTitle} style={{ marginBottom: 28 }}>
          {t("transfers.title")}
        </h2>

        <div className={styles.grid}>
          {transfers.map((transfer) => (
            <div key={transfer.id} className={`${shared.card} ${styles.item}`}>
              <div className={styles.top}>
                <span className={`${styles.badge} ${transfer.direction === "IN" ? styles.badgeIn : styles.badgeOut}`}>
                  {transfer.direction === "IN" ? t("transfers.in") : t("transfers.out")}
                </span>
                <span className={styles.date}>{formatShortDate(transfer.transferredAt, locale)}</span>
              </div>
              <div className={styles.name}>
                {transfer.playerNameFr}
                {transfer.playerNumber != null && ` (n°${transfer.playerNumber})`}
              </div>
              <div className={styles.club}>
                {transfer.direction === "IN"
                  ? t("transfers.fromClub", { club: localized(locale, transfer.otherTeamName, transfer.otherTeamNameAr) })
                  : t("transfers.toClub", { club: localized(locale, transfer.otherTeamName, transfer.otherTeamNameAr) })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
