import type { Metadata } from "next";
import { fetchMatches, fetchCritereDefinitions } from "@/lib/dataAccess";
import { getServerLocale, translate } from "@/lib/i18nServer";
import MatchCardClient from "@/components/MatchCardClient";
import SearchBox from "@/components/SearchBox";
import PaginationControls from "@/components/PaginationControls";
import { getSEOKeywords } from "@/lib/seo";
import type { CritereDefinition } from "@/types";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();

  const titleFr = "Matchs | ARBINOTE - Recherche de matchs";
  const titleEn = "Matches | ARBINOTE - Search matches";
  const titleAr = "المباريات | ARBINOTE - البحث عن مباراة";
  const title = locale === "ar" ? titleAr : locale === "en" ? titleEn : titleFr;

  const descriptionFr = "Recherchez un match de football par équipe et consultez ses détails sur ARBINOTE.";
  const descriptionEn = "Search a football match by team and view its details on ARBINOTE.";
  const descriptionAr = "ابحث عن مباراة كرة قدم حسب الفريق واطلع على تفاصيلها على ARBINOTE.";
  const description = locale === "ar" ? descriptionAr : locale === "en" ? descriptionEn : descriptionFr;

  return {
    title,
    description,
    keywords: [...getSEOKeywords(locale), "recherche match", "liste des matchs"],
    alternates: {
      canonical: `${baseUrl}/matches`,
      languages: {
        fr: `${baseUrl}/fr/matches`,
        en: `${baseUrl}/en/matches`,
        ar: `${baseUrl}/ar/matches`,
      },
    },
  };
}

export default async function MatchesPage({ searchParams }: PageProps) {
  const locale = await getServerLocale();
  const t = (key: string, params?: Record<string, string | number>) => translate(key, locale, params);

  const params = await searchParams;
  const q = params?.q?.trim() || undefined;
  const page = Math.max(1, Number(params?.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { rows: matches, total } = await fetchMatches(PAGE_SIZE, undefined, offset, q);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const criteresDefs = (await fetchCritereDefinitions()) as unknown as CritereDefinition[];

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-10 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
        {t("search.matchesTitle")}
      </h1>

      <SearchBox placeholder={t("search.matchesPlaceholder")} />

      {total > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("search.resultsCount", { count: total })}
        </p>
      )}

      {matches.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400 py-8 text-center">{t("search.noResults")}</p>
      ) : (
        <div className="space-y-4">
          {matches.map((match: any) => (
            <MatchCardClient key={match.id} match={match} criteresDefs={criteresDefs} />
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
