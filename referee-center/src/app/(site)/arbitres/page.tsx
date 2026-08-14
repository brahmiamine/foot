import type { Metadata } from "next";
import { fetchArbitres } from "@/lib/dataAccess";
import { getServerLocale, translate } from "@/lib/i18nServer";
import ArbitreCard from "@/components/ArbitreCard";
import SearchBox from "@/components/SearchBox";
import PaginationControls from "@/components/PaginationControls";
import { getSEOKeywords } from "@/lib/seo";
import type { Arbitre as ArbitreType } from "@/types";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
const PAGE_SIZE = 24;

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();

  const titleFr = "Arbitres | ARBINOTE - Recherche d'arbitres";
  const titleEn = "Referees | ARBINOTE - Search referees";
  const titleAr = "الحكام | ARBINOTE - البحث عن الحكام";
  const title = locale === "ar" ? titleAr : locale === "en" ? titleEn : titleFr;

  const descriptionFr = "Recherchez un arbitre de football par nom et consultez son profil sur ARBINOTE.";
  const descriptionEn = "Search a football referee by name and view their profile on ARBINOTE.";
  const descriptionAr = "ابحث عن حكم كرة قدم بالاسم واطلع على ملفه الشخصي على ARBINOTE.";
  const description = locale === "ar" ? descriptionAr : locale === "en" ? descriptionEn : descriptionFr;

  return {
    title,
    description,
    keywords: [...getSEOKeywords(locale), "recherche arbitre", "liste des arbitres"],
    alternates: {
      canonical: `${baseUrl}/arbitres`,
      languages: {
        fr: `${baseUrl}/fr/arbitres`,
        en: `${baseUrl}/en/arbitres`,
        ar: `${baseUrl}/ar/arbitres`,
      },
    },
  };
}

export default async function ArbitresPage({ searchParams }: PageProps) {
  const locale = await getServerLocale();
  const t = (key: string, params?: Record<string, string | number>) => translate(key, locale, params);

  const params = await searchParams;
  const q = params?.q?.trim() || undefined;
  const page = Math.max(1, Number(params?.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { rows: arbitres, total } = await fetchArbitres(PAGE_SIZE, offset, q);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-10 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
        {t("search.arbitresTitle")}
      </h1>

      <SearchBox placeholder={t("search.arbitresPlaceholder")} />

      {total > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("search.resultsCount", { count: total })}
        </p>
      )}

      {arbitres.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400 py-8 text-center">{t("search.noResults")}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(arbitres as unknown as ArbitreType[]).map((arbitre) => (
            <ArbitreCard key={arbitre.id} arbitre={arbitre} />
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
