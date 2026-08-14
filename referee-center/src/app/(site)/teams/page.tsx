import type { Metadata } from "next";
import { fetchTeams } from "@/lib/dataAccess";
import { getServerLocale, translate } from "@/lib/i18nServer";
import TeamCard from "@/components/TeamCard";
import SearchBox from "@/components/SearchBox";
import PaginationControls from "@/components/PaginationControls";
import { getSEOKeywords } from "@/lib/seo";
import type { Team as TeamType } from "@/types";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
const PAGE_SIZE = 24;

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();

  const titleFr = "Équipes | ARBINOTE - Recherche d'équipes";
  const titleEn = "Teams | ARBINOTE - Search teams";
  const titleAr = "الفرق | ARBINOTE - البحث عن الفرق";
  const title = locale === "ar" ? titleAr : locale === "en" ? titleEn : titleFr;

  const descriptionFr = "Recherchez une équipe de football par nom et consultez son profil sur ARBINOTE.";
  const descriptionEn = "Search a football team by name and view their profile on ARBINOTE.";
  const descriptionAr = "ابحث عن فريق كرة قدم بالاسم واطلع على ملفه على ARBINOTE.";
  const description = locale === "ar" ? descriptionAr : locale === "en" ? descriptionEn : descriptionFr;

  return {
    title,
    description,
    keywords: [...getSEOKeywords(locale), "recherche équipe", "liste des équipes"],
    alternates: {
      canonical: `${baseUrl}/teams`,
      languages: {
        fr: `${baseUrl}/fr/teams`,
        en: `${baseUrl}/en/teams`,
        ar: `${baseUrl}/ar/teams`,
      },
    },
  };
}

export default async function TeamsPage({ searchParams }: PageProps) {
  const locale = await getServerLocale();
  const t = (key: string, params?: Record<string, string | number>) => translate(key, locale, params);

  const params = await searchParams;
  const q = params?.q?.trim() || undefined;
  const page = Math.max(1, Number(params?.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { rows: teams, total } = await fetchTeams(PAGE_SIZE, offset, q);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-10 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
        {t("search.teamsTitle")}
      </h1>

      <SearchBox placeholder={t("search.teamsPlaceholder")} />

      {total > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("search.resultsCount", { count: total })}
        </p>
      )}

      {teams.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400 py-8 text-center">{t("search.noResults")}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(teams as unknown as TeamType[]).map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}

      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        previousLabel={t("pagination.previous")}
        nextLabel={t("pagination.next")}
        pageInfoLabel={t("pagination.pageInfo", { current: page, total: totalPages })}
      />
    </div>
  );
}
