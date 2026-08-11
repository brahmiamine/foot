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

const FACILITY_TYPE_LABELS: Record<string, string> = {
  STADIUM: "Stade",
  TRAINING_GROUND: "Terrain d'entraînement",
  LOCKER_ROOM: "Vestiaires",
  GYM: "Salle de musculation",
  SPORTS_CENTER: "Centre sportif",
  OTHER: "Installation",
};

export default async function ClubPage() {
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
            Le club
          </h1>
          <p className={shared.sectionSubtitle} style={{ marginBottom: 28, display: "block" }}>
            <Link href="/club/histoire">Voir l&apos;histoire et le palmarès du club →</Link>
          </p>

          {!hasInfo && <p className={shared.empty}>La présentation du club sera bientôt disponible.</p>}

          {info?.presentationFr && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>Qui sommes-nous ?</div>
              <div className={styles.text}>{info.presentationFr}</div>
            </div>
          )}
          {info?.valuesFr && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>Valeurs</div>
              <div className={styles.text}>{info.valuesFr}</div>
            </div>
          )}
          {info?.sportProjectFr && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>Projet sportif</div>
              <div className={styles.text}>{info.sportProjectFr}</div>
            </div>
          )}
          {info?.organizationFr && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>Organisation</div>
              <div className={styles.text}>{info.organizationFr}</div>
            </div>
          )}

          {facilities.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeading}>Installations</div>
              <div className={styles.facilitiesGrid}>
                {facilities.map((facility) => (
                  <div key={facility.id} className={`${shared.card} ${styles.facilityCard}`}>
                    <div className={styles.facilityType}>{FACILITY_TYPE_LABELS[facility.facilityType] ?? facility.facilityType}</div>
                    <div className={styles.facilityName}>{facility.nameFr}</div>
                    {facility.cityFr && <div className={styles.facilityMeta}>{facility.cityFr}</div>}
                    {facility.capacity && <div className={styles.facilityMeta}>Capacité : {facility.capacity.toLocaleString()}</div>}
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
