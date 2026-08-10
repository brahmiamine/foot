import { getObTeam } from "@/lib/ob-team";
import { PublicNewsService } from "@/services/PublicNewsService";
import { PageChrome } from "@/components/PageChrome";
import { NewsCard } from "@/components/NewsCard";
import shared from "@/components/shared.module.css";
import newsStyles from "@/components/NewsSection.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Actualités — Olympique de Béja",
};

export default async function ActualitesPage() {
  const team = await getObTeam();
  const news = team ? await new PublicNewsService().getAll(team.id) : [];

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 28 }}>
            Actualités
          </h1>

          {news.length === 0 ? (
            <p className={shared.empty}>Aucune actualité publiée pour le moment.</p>
          ) : (
            <div className={newsStyles.grid}>
              {news.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageChrome>
  );
}
