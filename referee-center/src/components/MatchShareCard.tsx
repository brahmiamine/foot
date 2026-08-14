"use client";

import { Match, CritereDefinition, Vote } from "@/types";
import { formatDate, getLocalizedName, getJourneeDisplayName, roundNote } from "@/lib/utils";

export interface ShareBrandingInfo {
  leagueName?: string | null;
  leagueLogoUrl?: string | null;
  federationName?: string | null;
  federationLogoUrl?: string | null;
}

interface MatchShareCardProps {
  match: Match;
  locale: string;
  vote: Vote;
  criteresDefs: CritereDefinition[];
  branding?: ShareBrandingInfo | null;
}

function getAverage(values: number[]): number | null {
  if (!values.length) return null;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return roundNote(sum / values.length);
}

function computeCategoryAverages(criteresDefs: CritereDefinition[], vote: Vote) {
  const definitionMap = new Map<string, CritereDefinition>();
  criteresDefs.forEach((critere) => {
    definitionMap.set(critere.id, critere);
  });

  const buckets = {
    arbitre: [] as number[],
    var: [] as number[],
    assistant: [] as number[],
  };

  Object.entries(vote.criteres).forEach(([critereId, rawValue]) => {
    const numericValue = typeof rawValue === "number" ? rawValue : parseFloat(String(rawValue));
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return;
    }
    const category = definitionMap.get(critereId)?.categorie ?? "arbitre";
    buckets[category].push(numericValue);
  });

  return {
    arbitre: getAverage(buckets.arbitre),
    var: getAverage(buckets.var),
    assistant: getAverage(buckets.assistant),
  };
}

export default function MatchShareCard({ match, locale, vote, criteresDefs, branding }: MatchShareCardProps) {
  const homeName = getLocalizedName(locale, {
    defaultValue: match.equipe_home.nom,
    fr: match.equipe_home.nom,
    en: match.equipe_home.nom_en ?? match.equipe_home.nom,
    ar: match.equipe_home.nom_ar ?? match.equipe_home.nom,
  });
  const awayName = getLocalizedName(locale, {
    defaultValue: match.equipe_away.nom,
    fr: match.equipe_away.nom,
    en: match.equipe_away.nom_en ?? match.equipe_away.nom,
    ar: match.equipe_away.nom_ar ?? match.equipe_away.nom,
  });
  const dateLabel = match.date ? formatDate(match.date, locale) : "";
  const journeeLabel = match.journee 
    ? getJourneeDisplayName(match.journee, locale)
    : null;
  const refereeName = match.arbitre
    ? getLocalizedName(locale, {
        defaultValue: match.arbitre.nom,
        fr: match.arbitre.nom,
        en: match.arbitre.nom_en ?? match.arbitre.nom,
        ar: match.arbitre.nom_ar ?? match.arbitre.nom,
      })
    : null;
  const categoryAverages = computeCategoryAverages(criteresDefs, vote);
  const metrics = [
    { label: "Arbitre", value: categoryAverages.arbitre, accent: "from-blue-500 to-blue-400" },
    { label: "VAR", value: categoryAverages.var, accent: "from-emerald-500 to-emerald-400" },
    { label: "Assist.", value: categoryAverages.assistant, accent: "from-amber-500 to-amber-400" },
  ];

  const appLogoSrc = "/logo-dark.png";

  return (
    <div className="w-[255px] sm:w-[270px]">
      <div className="share-card-content relative rounded-[22px] bg-linear-to-br from-[#020617] via-[#0f172a] to-[#1e3a8a] px-2.5 py-1.5 sm:px-3 sm:py-2 text-white shadow-[0_8px_24px_rgba(15,23,42,0.55)]">
        <div className="absolute inset-0 rounded-[22px] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.35),transparent_50%)] pointer-events-none" />
        <div className="relative flex items-center justify-between gap-0.5 py-0.5">
          <div className="flex flex-1 items-center justify-start">
            {branding?.leagueLogoUrl ? (
              <img src={branding.leagueLogoUrl} alt="Ligue" className="h-7 w-7 rounded-2xl bg-white/10 p-1 object-contain" crossOrigin="anonymous" />
            ) : (
              <div className="h-7 w-7" />
            )}
          </div>
          <div className="flex-1 flex justify-center items-center">
            <img src={appLogoSrc} alt="Arbinote" className="h-16 w-16 object-contain" crossOrigin="anonymous" />
          </div>
          <div className="flex flex-1 items-center justify-end">
            {branding?.federationLogoUrl ? (
              <img
                src={branding.federationLogoUrl}
                alt="Fédération"
                className="h-7 w-7 rounded-2xl bg-white/10 p-1 object-contain"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="h-7 w-7" />
            )}
          </div>
        </div>

        <div className="relative mt-0 rounded-3xl bg-white/5 p-2.5">
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/70">Match</p>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex flex-1 flex-col items-center text-center gap-1">
              {match.equipe_home.logo_url ? (
                <img
                  src={match.equipe_home.logo_url}
                  alt={homeName}
                  className="h-12 w-12 rounded-full bg-white/10 p-2 object-contain"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-base font-bold text-white">
                  {homeName.charAt(0)}
                </div>
              )}
              <div className="text-[11px] font-semibold text-white leading-snug wrap-break-word">{homeName}</div>
            </div>
            <div className="flex min-w-[60px] flex-col items-center justify-center text-center">
              {typeof match.score_home === "number" && typeof match.score_away === "number" ? (
                <>
                  <p className="text-xl font-bold text-white">
                    {match.score_home} - {match.score_away}
                  </p>
                  <p className="text-[9px] uppercase tracking-wide text-white/70 whitespace-nowrap">Score final</p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-white/80">VS</p>
                  <p className="text-[9px] uppercase tracking-wide text-white/70 whitespace-nowrap">À venir</p>
                </>
              )}
            </div>
            <div className="flex flex-1 flex-col items-center text-center gap-1">
              {match.equipe_away.logo_url ? (
                <img
                  src={match.equipe_away.logo_url}
                  alt={awayName}
                  className="h-12 w-12 rounded-full bg-white/10 p-2 object-contain"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-base font-bold text-white">
                  {awayName.charAt(0)}
                </div>
              )}
              <div className="text-[11px] font-semibold text-white leading-snug wrap-break-word">{awayName}</div>
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1 text-[9px] text-white/80">
            {journeeLabel && <span className="rounded-full bg-white/10 px-2.5 py-0.5">{journeeLabel}</span>}
            {dateLabel && <span className="rounded-full bg-white/10 px-2.5 py-0.5">{dateLabel}</span>}
          </div>
        </div>

        <div className="relative mt-2 space-y-2 rounded-3xl bg-white/5 p-2.5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <div>
              <p className="text-[9px] uppercase tracking-[0.3em] text-white/70">Note globale</p>
              <p className="text-3xl font-black leading-tight">{vote.note_globale.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/80">
              {vote.created_at ? new Date(vote.created_at).toLocaleDateString("fr-FR") : "Fan certifié"}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {metrics.map((metric) => (
              <div key={metric.label} className={`rounded-2xl bg-linear-to-br ${metric.accent} p-2.5 text-center shadow-md`}>
                <p className="text-[9px] uppercase tracking-[0.15em] text-white/70">{metric.label}</p>
                <p className="mt-0.5 text-lg font-bold">{typeof metric.value === "number" ? `${metric.value.toFixed(2)}` : "—"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-3 rounded-3xl bg-white/5 p-2.5 text-[10px] text-white">
          <div className="flex flex-col gap-1">
            {refereeName && (
              <p>
                <span className="text-white/60">Arbitre :</span> <span className="font-semibold">{refereeName}</span>
              </p>
            )}
            {branding?.leagueName && (
              <p>
                <span className="text-white/60">Compétition :</span> <span className="font-semibold">{branding.leagueName}</span>
              </p>
            )}
            {branding?.federationName && (
              <p>
                <span className="text-white/60">Fédération :</span> <span className="font-semibold">{branding.federationName}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
