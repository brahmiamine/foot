"use client";

import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import { formatDate, getLocalizedName, getJourneeDisplayName } from "@/lib/utils";
import { Match } from "@/types";
import { useTranslations } from "@/lib/i18n";
import { useVote } from "@/contexts/VoteContext";
import { ShareBannerState, Vote } from "./types";

export function useMatchCardClient(match: Match) {
  const { t, locale } = useTranslations();
  const router = useRouter();
  const [isPreviewOpen, setPreviewOpen] = useState(false);
  const [isShareOpen, setShareOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const { hasVoted, getUserVote, fingerprint } = useVote();
  const [shareBanner, setShareBanner] = useState<ShareBannerState | null>(null);
  const [isGeneratingImage, setGeneratingImage] = useState(false);
  const [nativeShareInProgress, setNativeShareInProgress] = useState(false);
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const [userVote, setUserVote] = useState<Vote | null>(null);

  // Utiliser le contexte pour vérifier si l'utilisateur peut partager (dynamique depuis la DB)
  const canShare = hasVoted(match.id);

  // Charger le vote uniquement quand nécessaire (pour le partage)
  useEffect(() => {
    if (canShare && !userVote) {
      getUserVote(match.id).then(setUserVote);
    }
  }, [canShare, match.id, getUserVote, userVote]);
  const dateLabel = match.date ? formatDate(match.date, locale) : t("common.datePending");
  const journeeLabel = match.journee ? getJourneeDisplayName(match.journee, locale) : null;

  // Vérifier si le match est en cours pour mettre le score en rouge
  const isMatchLive =
    match.date &&
    (() => {
      try {
        const matchDate = typeof match.date === "string" ? new Date(match.date) : match.date;
        const now = new Date();
        if (matchDate > now) return false;
        const diffMs = now.getTime() - matchDate.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes >= 0 && diffMinutes <= 93; // Match en cours si moins de 93 min
      } catch {
        return false;
      }
    })();
  const homeName = getLocalizedName(locale, {
    defaultValue: match.equipe_home.nom,
    fr: match.equipe_home.nom,
    en: match.equipe_home.nom_en ?? undefined,
    ar: match.equipe_home.nom_ar ?? undefined,
  });
  const awayName = getLocalizedName(locale, {
    defaultValue: match.equipe_away.nom,
    fr: match.equipe_away.nom,
    en: match.equipe_away.nom_en ?? undefined,
    ar: match.equipe_away.nom_ar ?? undefined,
  });
  const homeLabel = match.equipe_home.abbr || homeName;
  const awayLabel = match.equipe_away.abbr || awayName;
  const homeCity =
    match.equipe_home.city || match.equipe_home.city_ar || match.equipe_home.city_en
      ? getLocalizedName(locale, {
          defaultValue: match.equipe_home.city ?? match.equipe_home.city_en ?? match.equipe_home.city_ar ?? "",
          fr: match.equipe_home.city ?? undefined,
          en: match.equipe_home.city_en ?? undefined,
          ar: match.equipe_home.city_ar ?? undefined,
        })
      : null;
  const awayCity =
    match.equipe_away.city || match.equipe_away.city_ar || match.equipe_away.city_en
      ? getLocalizedName(locale, {
          defaultValue: match.equipe_away.city ?? match.equipe_away.city_en ?? match.equipe_away.city_ar ?? "",
          fr: match.equipe_away.city ?? undefined,
          en: match.equipe_away.city_en ?? undefined,
          ar: match.equipe_away.city_ar ?? undefined,
        })
      : null;
  const refereeName = match.arbitre
    ? getLocalizedName(locale, {
        defaultValue: match.arbitre.nom,
        fr: match.arbitre.nom,
        en: match.arbitre.nom_en ?? undefined,
        ar: match.arbitre.nom_ar ?? undefined,
      })
    : null;
  const refereeCategory =
    match.arbitre && (match.arbitre.categorie || match.arbitre.categorie_ar)
      ? getLocalizedName(locale, {
          defaultValue: match.arbitre.categorie ?? match.arbitre.categorie_ar ?? "",
          fr: match.arbitre.categorie ?? undefined,
          en: match.arbitre.categorie ?? undefined,
          ar: match.arbitre.categorie_ar ?? undefined,
        })
      : null;

  const hasScore = match.score_home !== null && match.score_home !== undefined && match.score_away !== null && match.score_away !== undefined;

  const handleCardClick = () => {
    router.push(`/matches/${match.id}`);
  };

  const stopPropagation = (event: MouseEvent) => {
    event.stopPropagation();
  };


  const fetchUserVote = useCallback(async () => {
    setShareBanner(null);
    setShareLoading(true);

    // Récupérer le vote directement depuis la DB
    const vote = await getUserVote(match.id);
    if (!vote) {
      setShareBanner({
        variant: "info",
        text: t("share.noVote"),
      });
      setUserVote(null);
    } else {
      setUserVote(vote);
    }

    setShareLoading(false);
  }, [match.id, getUserVote, t]);

  const openShareModal = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      setShareOpen(true);
      setShareBanner(null);
      if (!userVote) {
        fetchUserVote();
      }
    },
    [fetchUserVote]
  );

  const closeShareModal = useCallback(() => {
    setShareOpen(false);
  }, []);

  const generateImageDataUrl = useCallback(async () => {
    if (!shareCardRef.current) {
      setShareBanner({
        variant: "error",
        text: t("share.generateError"),
      });
      return null;
    }
    setShareBanner(null);
    setGeneratingImage(true);
    try {
      const dataUrl = await toPng(shareCardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        canvasWidth: shareCardRef.current.clientWidth * 3,
        canvasHeight: shareCardRef.current.clientHeight * 3,
        backgroundColor: "#020617",
      });
      return dataUrl;
    } catch (error) {
      console.error("Share image generation failed:", error);
      setShareBanner({
        variant: "error",
        text: t("share.generateError"),
      });
      return null;
    } finally {
      setGeneratingImage(false);
    }
  }, [t]);

  const handleDownloadShare = useCallback(async () => {
    const dataUrl = await generateImageDataUrl();
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `referee-center-vote-${match.id}.png`;
    link.click();
    setShareBanner({
      variant: "success",
      text: t("share.downloaded"),
    });
  }, [generateImageDataUrl, match.id, t]);

  const handleNativeShare = useCallback(async () => {
    const dataUrl = await generateImageDataUrl();
    if (!dataUrl) return;
    setNativeShareInProgress(true);
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `referee-center-vote-${match.id}.png`, { type: "image/png" });
      const title = t("share.nativeTitle", { match: `${homeName} vs ${awayName}` });
      const text = t("share.nativeText");
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text,
        });
        setShareBanner({
          variant: "success",
          text: t("share.shared"),
        });
      } else {
        setShareBanner({
          variant: "warning",
          text: t("share.nativeUnsupported"),
        });
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `referee-center-vote-${match.id}.png`;
        link.click();
      }
    } catch (error) {
      console.error("Native share failed:", error);
      setShareBanner({
        variant: "error",
        text: t("share.error"),
      });
    } finally {
      setNativeShareInProgress(false);
    }
  }, [awayName, generateImageDataUrl, homeName, match.id, t]);

  return {
    t,
    locale,
    router,
    isPreviewOpen,
    setPreviewOpen,
    isShareOpen,
    setShareOpen,
    shareLoading,
    shareBanner,
    isGeneratingImage,
    nativeShareInProgress,
    shareCardRef,
    userVote,
    canShare,
    dateLabel,
    journeeLabel,
    isMatchLive,
    homeName,
    awayName,
    refereeName,
    refereeCategory,
    hasScore,
    handleCardClick,
    stopPropagation,
    openShareModal,
    closeShareModal,
    handleDownloadShare,
    handleNativeShare,
  };
}
