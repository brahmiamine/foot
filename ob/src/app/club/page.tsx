import { getTranslator } from "@/i18n/server";
import Link from "next/link";
import { getObTeam } from "@/lib/ob-team";
import { PublicClubService } from "@/services/PublicClubService";
import { PublicStadiumService } from "@/services/PublicStadiumService";
import { PageChrome } from "@/components/PageChrome";
import shared from "@/components/shared.module.css";
import styles from "./club.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Le club — Olympique de Béja",
};

const FACILITY_TYPE_LABELS = {
  STADIUM: "facility.stadium", TRAINING_GROUND: "facility.training", LOCKER_ROOM: "facility.locker",
  GYM: "facility.gym", SPORTS_CENTER: "facility.center", OTHER: "facility.other",
} as const;

export default async function ClubPage() {
  const { t } = await getTranslator();
  const team = await getObTeam();
  const [info, facilities] = team
    ? await Promise.all([new PublicClubService().getClubInfo(team.id), new PublicStadiumService().getAllFacilities(team.id)])
    : [null, []];

  const hasInfo = info && (info.presentationFr || info.valuesFr || info.sportProjectFr || info.organizationFr);

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            {t("club.title")}
          </h1>
          <p className={shared.sectionSubtitle} style={{ marginBottom: 28, display: "block" }}>
            <Link href="/club/histoire">{t("club.historyLink")}</Link>
          </p>

          {!hasInfo && <p className={shared.empty}>{t("club.empty")}</p>}

          {info?.presentationFr && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>{t("club.about")}</div>
              <div className={styles.text}>{info.presentationFr}</div>
            </div>
          )}
          {info?.valuesFr && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>{t("club.values")}</div>
              <div className={styles.text}>{info.valuesFr}</div>
            </div>
          )}
          {info?.sportProjectFr && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>{t("club.project")}</div>
              <div className={styles.text}>{info.sportProjectFr}</div>
            </div>
          )}
          {info?.organizationFr && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>{t("club.organization")}</div>
              <div className={styles.text}>{info.organizationFr}</div>
            </div>
          )}

          {facilities.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>{t("club.facilities")}</div>
              <div className={styles.facilitiesGrid}>
                {facilities.map((facility) => (
                  <div key={facility.id} className={`${shared.card} ${styles.facilityCard}`}>
                    <div className={styles.facilityType}>{facility.facilityType in FACILITY_TYPE_LABELS ? t(FACILITY_TYPE_LABELS[facility.facilityType as keyof typeof FACILITY_TYPE_LABELS]) : facility.facilityType}</div>
                    <div className={styles.facilityName}>{facility.nameFr}</div>
                    {facility.cityFr && <div className={styles.facilityMeta}>{facility.cityFr}</div>}
                    {facility.capacity && <div className={styles.facilityMeta}>{t("club.capacity", { capacity: facility.capacity.toLocaleString() })}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
