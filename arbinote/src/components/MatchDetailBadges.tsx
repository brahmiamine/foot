"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "@/lib/i18n";
import { Match, CritereDefinition, Vote } from "@/types";
import { useVote } from "@/contexts/VoteContext";
import { toPng } from "html-to-image";
import { FaDownload, FaShareAlt, FaTimes } from "react-icons/fa";
import MatchShareCard, { ShareBrandingInfo } from "./MatchShareCard";
import AlertBanner, { AlertVariant } from "./ui/AlertBanner";

interface MatchDetailBadgesProps {
  match: Match;
  criteresDefs: CritereDefinition[];
  shareBranding?: ShareBrandingInfo | null;
  locale: string;
}

export default function MatchDetailBadges({ match, criteresDefs, shareBranding, locale }: MatchDetailBadgesProps) {
  const { t } = useTranslations();
  const { hasVoted, getUserVote, fingerprint } = useVote();
  const [isShareOpen, setShareOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareBanner, setShareBanner] = useState<{ variant: AlertVariant; text: string } | null>(null);
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

  const openShareModal = useCallback(() => {
    setShareOpen(true);
    setShareBanner(null);
    if (!userVote) {
      fetchUserVote();
    }
  }, [userVote, fetchUserVote]);

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
    link.download = `arbinote-vote-${match.id}.png`;
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
      const file = new File([blob], `arbinote-vote-${match.id}.png`, { type: "image/png" });
      const homeName = match.equipe_home?.nom || "Home";
      const awayName = match.equipe_away?.nom || "Away";
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
        link.download = `arbinote-vote-${match.id}.png`;
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
  }, [generateImageDataUrl, match.id, match.equipe_home?.nom, match.equipe_away?.nom, t]);

  if (!canShare) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50/60 px-3 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shrink-0"
        onClick={openShareModal}
        aria-label={t("share.buttonLabel")}
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 6l-4-4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 2v14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {t("share.buttonLabel")}
      </button>

      {isShareOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeShareModal}
        >
          <div
            className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-gray-900 p-4 sm:p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4 pr-6 sm:pr-8">
              <div className="flex items-center justify-between gap-3 pt-6">
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">{t("share.title")}</p>
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-300">
                  <button
                    type="button"
                    className="p-2 rounded-full border border-blue-200 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                    onClick={handleDownloadShare}
                    disabled={isGeneratingImage}
                    aria-label={t("share.download")}
                  >
                    <FaDownload className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="p-2 rounded-full border border-blue-200 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition disabled:opacity-60"
                    onClick={handleNativeShare}
                    disabled={isGeneratingImage || nativeShareInProgress}
                    aria-label={t("share.shareNative")}
                  >
                    <FaShareAlt className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="p-2 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800/40 transition text-gray-500 dark:text-gray-300"
                    onClick={closeShareModal}
                    aria-label={t("common.close")}
                  >
                    <FaTimes className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {shareBanner && <AlertBanner variant={shareBanner.variant} message={shareBanner.text} />}

              {shareLoading ? (
                <AlertBanner variant="info" message={t("share.loadingVote")} />
              ) : userVote ? (
                <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                  <div className="text-xs uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500 mb-2">{t("share.previewLabel")}</div>
                  <div className="flex justify-center">
                    <div ref={shareCardRef}>
                      <MatchShareCard match={match} locale={locale} vote={userVote} criteresDefs={criteresDefs} branding={shareBranding} />
                    </div>
                  </div>
                </div>
              ) : (
                <AlertBanner
                  variant="warning"
                  title={t("share.noVote")}
                  message={t("share.cta.vote")}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

