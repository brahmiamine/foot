import { getLocalizedMetadata, getTranslator } from "@/i18n/server";
import { getObTeam } from "@/lib/ob-team";
import { assertSectionEnabled } from "@/lib/publicContentPolicy";
import { PublicSponsorService } from "@/services/PublicSponsorService";
import { resolveAssetUrl } from "@/lib/assets";
import { getSponsorRequestUrl } from "@/lib/sponsor";
import { PageChrome } from "@/components/PageChrome";
import shared from "@/components/shared.module.css";
import styles from "./partenaires.module.css";

export const dynamic = "force-dynamic";

export const generateMetadata = () => getLocalizedMetadata("metadata.partners");

const LEVEL_GROUPS: Array<{ level: "OR" | "ARGENT"; key: "partners.main" | "partners.official" }> = [
  { level: "OR", key: "partners.main" },
  { level: "ARGENT", key: "partners.official" },
];

export default async function PartenairesPage() {
  const { t } = await getTranslator();
  const team = await getObTeam();
  await assertSectionEnabled(team?.id, "PARTNERS");
  const sponsors = team ? await new PublicSponsorService().getActive(team.id) : [];
  const sponsorUrl = team ? getSponsorRequestUrl(team.id) : null;

  const others = sponsors.filter((s) => s.level === "BRONZE" || s.level === "LOCAL");

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 28, textAlign: "center" }}>
            {t("partners.title")}
          </h1>

          {sponsors.length === 0 ? (
            <p className={shared.empty}>{t("partners.empty")}</p>
          ) : (
            <>
              {LEVEL_GROUPS.map(({ level, key }) => {
                const group = sponsors.filter((s) => s.level === level);
                if (group.length === 0) return null;
                return (
                  <div key={level} className={styles.levelGroup}>
                    <div className={styles.levelTitle}>{t(key)}</div>
                    <div className={styles.grid}>
                      {group.map((sponsor) => (
                        <SponsorLogo key={sponsor.id} name={sponsor.companyName} logoUrl={sponsor.logoUrl} website={sponsor.website} />
                      ))}
                    </div>
                  </div>
                );
              })}

              {others.length > 0 && (
                <div className={styles.levelGroup}>
                  <div className={styles.levelTitle}>{t("partners.title")}</div>
                  <div className={styles.grid}>
                    {others.map((sponsor) => (
                      <SponsorLogo key={sponsor.id} name={sponsor.companyName} logoUrl={sponsor.logoUrl} website={sponsor.website} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {sponsorUrl && (
            <div className={styles.cta}>
              <a href={sponsorUrl} className={shared.btnPrimary}>
                {t("footer.becomeSponsor")}
              </a>
            </div>
          )}
        </div>
      </div>
    </PageChrome>
  );
}

function SponsorLogo({ name, logoUrl, website }: { name: string; logoUrl: string | null | undefined; website: string | null | undefined }) {
  const resolvedLogo = resolveAssetUrl(logoUrl);
  const content = resolvedLogo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolvedLogo} alt={name} className={styles.logo} />
  ) : (
    <span className={styles.name}>{name}</span>
  );

  const card = <div className={`${shared.card} ${styles.logoCard}`}>{content}</div>;

  if (website) {
    return (
      <a href={website} target="_blank" rel="noreferrer" title={name}>
        {card}
      </a>
    );
  }
  return card;
}
