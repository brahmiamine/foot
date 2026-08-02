import Link from "next/link";
import { buildBayesianRanking } from "@/lib/bayesianRanking";
import { CritereDefinition, Vote } from "@/types";
import { getServerLocale, translate } from "@/lib/i18nServer";
import { getLocalizedName, getJourneeDisplayName } from "@/lib/utils";
import {
  fetchCritereDefinitions,
  fetchVotesByMatchIds,
  fetchTopMatchesByCriteresBayesian,
  fetchMatchesByJournee,
  fetchFederationsWithLeagues,
} from "@/lib/dataAccess";
import { getActiveLeagueId } from "@/lib/leagueSelection";
import ClassementClient from "@/components/ClassementClient";
import { fetchCurrentJournee, fetchJourneesWithMatchDates, calculateJourneeWindows } from "@/lib/currentJournee";
import type { Metadata } from "next";
import { getSEODescription, getSEOKeywords } from "@/lib/seo";
import StructuredData from "@/components/StructuredData";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const leagueId = await getActiveLeagueId()
  const federations = await fetchFederationsWithLeagues()
  
  let activeLeague = null
  if (leagueId) {
    for (const fed of federations) {
      const league = fed.leagues.find((l: any) => l.id === leagueId)
      if (league) {
        activeLeague = league
        break
      }
    }
  }

  const leagueName = activeLeague
    ? getLocalizedName(locale, {
        defaultValue: activeLeague.nom,
        fr: activeLeague.nom,
        en: activeLeague.nom_en ?? activeLeague.nom,
        ar: activeLeague.nom_ar ?? activeLeague.nom,
      })
    : ''

  const title = leagueName
    ? `Classement des Arbitres ${leagueName} | ARBINOTE`
    : 'Classement des Arbitres | ARBINOTE'

  const descriptionFr = `Consultez le classement des arbitres de football ${leagueName ? `de ${leagueName}` : ''}. Découvrez les meilleurs arbitres selon les votes de la communauté, les statistiques détaillées et les performances par journée.`
  const descriptionEn = `View the football referee rankings ${leagueName ? `for ${leagueName}` : ''}. Discover the best referees according to community votes, detailed statistics and performances by matchday.`
  const descriptionAr = `اطلع على ترتيب حكام كرة القدم ${leagueName ? `لـ ${leagueName}` : ''}. اكتشف أفضل الحكام حسب تصويتات المجتمع، الإحصائيات التفصيلية والأداء حسب الجولة.`

  const description = locale === 'ar' ? descriptionAr : locale === 'en' ? descriptionEn : descriptionFr
  const keywords = [
    ...getSEOKeywords(locale),
    'classement arbitres',
    'ranking arbitres',
    'meilleur arbitre',
    'statistiques arbitres',
    'performance arbitre',
  ]

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/classement`,
      siteName: 'ARBINOTE',
      locale: locale === 'ar' ? 'ar_TN' : locale === 'en' ? 'en_US' : 'fr_FR',
      alternateLocale: ['fr_FR', 'en_US', 'ar_TN'],
      type: 'website',
      images: [
        {
          url: `${baseUrl}/logo-light.png`,
          width: 1200,
          height: 630,
          alt: 'Classement des arbitres - ARBINOTE',
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/logo-light.png`],
    },
    alternates: {
      canonical: `${baseUrl}/classement`,
      languages: {
        fr: `${baseUrl}/fr/classement`,
        en: `${baseUrl}/en/classement`,
        ar: `${baseUrl}/ar/classement`,
      },
    },
  }
}

export default async function ClassementPage() {
  const locale = await getServerLocale();
  const t = (key: string, params?: Record<string, string | number>) => translate(key, locale, params);
  const leagueId = await getActiveLeagueId();
  const referenceDate = new Date();
  
  // Récupérer la journée courante avec la nouvelle logique
  const currentJourneeData = await fetchCurrentJournee(leagueId ?? undefined, referenceDate);
  
  // Récupérer toutes les journées pour trouver la précédente
  const allJournees = await fetchJourneesWithMatchDates(leagueId ?? undefined);
  const journeesWithWindows = calculateJourneeWindows(allJournees);
  
  // Trouver la journée précédente (terminée, avec le numéro le plus élevé < numéro de la journée courante)
  let previousJourneeData: typeof currentJourneeData = null;
  
  if (currentJourneeData) {
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);
    
    // Filtrer les journées terminées avec un numéro < numéro de la journée courante
    const finishedJournees = journeesWithWindows
      .filter((j) => {
        if (!j.first_match_date || j.numero >= currentJourneeData.numero) return false;
        
        // Une journée est terminée si le dernier match est < aujourd'hui
        if (!j.last_match_date) return false;
        
        const lastMatchDate = new Date(j.last_match_date);
        lastMatchDate.setHours(23, 59, 59, 999);
        return lastMatchDate < today;
      })
      .sort((a, b) => b.numero - a.numero); // Trier par numéro décroissant
    
    // Prendre la journée terminée avec le numéro le plus élevé (la plus récente)
    if (finishedJournees.length > 0) {
      previousJourneeData = finishedJournees[0];
    }
  }
  
  // Convertir en format compatible avec le reste du code
  const current = currentJourneeData ? {
    id: currentJourneeData.id,
    numero: currentJourneeData.numero,
    saison_id: currentJourneeData.saison_id,
    date_journee: currentJourneeData.date_journee,
  } : null;
  
  const previous = previousJourneeData ? {
    id: previousJourneeData.id,
    numero: previousJourneeData.numero,
    saison_id: previousJourneeData.saison_id,
    date_journee: previousJourneeData.date_journee,
  } : null;

  const criteresDefinitions = (await fetchCritereDefinitions()) as unknown as CritereDefinition[];
  const arbitreCriteres = criteresDefinitions.filter((c) => c.categorie === "arbitre");

  let currentRanking: any[] = [];
  let previousRanking: any[] = [];
  let topVarMatches: any[] = [];
  let topAssistantMatches: any[] = [];
  let allMatchIds: string[] = [];

  // Charger les classements pour la journée courante avec score bayésien
  if (current) {
    const matches = await fetchMatchesByJournee(current.id);
    const matchIds = matches.map((m) => m.id);
    allMatchIds.push(...matchIds);
    const votes = (await fetchVotesByMatchIds(matchIds)) as Vote[];
    currentRanking = buildBayesianRanking(votes, {
      criteres: arbitreCriteres,
      includeCategories: ["arbitre"],
    });
  }

  // Charger les classements pour la journée précédente avec score bayésien
  if (previous) {
    const matches = await fetchMatchesByJournee(previous.id);
    const matchIds = matches.map((m) => m.id);
    allMatchIds.push(...matchIds);
    const votes = (await fetchVotesByMatchIds(matchIds)) as Vote[];
    previousRanking = buildBayesianRanking(votes, {
      criteres: arbitreCriteres,
      includeCategories: ["arbitre"],
    });
  }

  // Charger les top matchs VAR et Assistants avec score bayésien
  if (allMatchIds.length > 0) {
    topVarMatches = await fetchTopMatchesByCriteresBayesian(allMatchIds, "var", 5);
    topAssistantMatches = await fetchTopMatchesByCriteresBayesian(allMatchIds, "assistant", 5);
  }

  // Structured Data JSON-LD pour le SEO
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: locale === 'ar' ? 'الرئيسية' : locale === 'en' ? 'Home' : 'Accueil',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: locale === 'ar' ? 'الترتيب' : locale === 'en' ? 'Rankings' : 'Classement',
        item: `${baseUrl}/classement`,
      },
    ],
  }

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: locale === 'ar' ? 'ترتيب الحكام' : locale === 'en' ? 'Referee Rankings' : 'Classement des Arbitres',
    description: locale === 'ar'
      ? 'ترتيب حكام كرة القدم حسب التصويتات والإحصائيات'
      : locale === 'en'
      ? 'Football referee rankings based on votes and statistics'
      : 'Classement des arbitres de football selon les votes et statistiques',
    url: `${baseUrl}/classement`,
    inLanguage: locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-FR',
  }

  return (
    <>
      <StructuredData data={breadcrumbSchema} />
      <StructuredData data={webPageSchema} />
      <ClassementClient
        current={current}
        previous={previous}
        currentRanking={currentRanking}
        previousRanking={previousRanking}
        topVarMatches={topVarMatches}
        topAssistantMatches={topAssistantMatches}
        locale={locale}
      />
    </>
  );
}
