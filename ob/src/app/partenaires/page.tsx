import { getObTeam } from "@/lib/ob-team";
import { PublicSponsorService } from "@/services/PublicSponsorService";
import { resolveAssetUrl } from "@/lib/assets";
import { getSponsorRequestUrl } from "@/lib/sponsor";
import { PageChrome } from "@/components/PageChrome";
import shared from "@/components/shared.module.css";
import styles from "./partenaires.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Partenaires — Olympique de Béja",
};

const LEVEL_GROUPS: Array<{ level: "OR" | "ARGENT"; title: string }> = [
  { level: "OR", title: "Partenaires principaux" },
  { level: "ARGENT", title: "Partenaires officiels" },
];

export default async function PartenairesPage() {
  const team = await getObTeam();
  const sponsors = team ? await new PublicSponsorService().getActive(team.id) : [];
  const sponsorUrl = team ? getSponsorRequestUrl(team.id) : null;

  const others = sponsors.filter((s) => s.level === "BRONZE" || s.level === "LOCAL");

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 28, textAlign: "center" }}>
            Nos partenaires
          </h1>

          {sponsors.length === 0 ? (
            <p className={shared.empty}>Le club recherche activement des partenaires.</p>
          ) : (
            <>
              {LEVEL_GROUPS.map(({ level, title }) => {
                const group = sponsors.filter((s) => s.level === level);
                if (group.length === 0) return null;
                return (
                  <div key={level} className={styles.levelGroup}>
                    <div className={styles.levelTitle}>{title}</div>
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
                  <div className={styles.levelTitle}>Partenaires</div>
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
                Devenir sponsor
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
