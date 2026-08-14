import { RefObject } from "react";
import { useRouter } from "next/navigation";
import AlertBanner from "../ui/AlertBanner";
import MatchShareCard, { ShareBrandingInfo } from "../MatchShareCard";
import { FaDownload, FaShareAlt, FaEye, FaTimes } from "react-icons/fa";
import { CritereDefinition, Match, Vote } from "@/types";
import { ShareBannerState, TFunction } from "./types";

interface ShareModalProps {
  t: TFunction;
  locale: string;
  router: ReturnType<typeof useRouter>;
  match: Match;
  criteresDefs: CritereDefinition[];
  shareBranding?: ShareBrandingInfo | null;
  shareCardRef: RefObject<HTMLDivElement | null>;
  shareBanner: ShareBannerState | null;
  shareLoading: boolean;
  userVote: Vote | null;
  isGeneratingImage: boolean;
  nativeShareInProgress: boolean;
  onDownloadShare: () => void;
  onNativeShare: () => void;
  onClose: () => void;
}

export function ShareModal({
  t,
  locale,
  router,
  match,
  criteresDefs,
  shareBranding,
  shareCardRef,
  shareBanner,
  shareLoading,
  userVote,
  isGeneratingImage,
  nativeShareInProgress,
  onDownloadShare,
  onNativeShare,
  onClose,
}: ShareModalProps) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={() => {
        onClose();
      }}
    >
      <div
        className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-gray-900 p-4 sm:p-6 shadow-2xl mx-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 pt-2 sm:pt-6 px-2 sm:px-0">
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">{t("share.title")}</p>
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-300">
              <button
                type="button"
                className="p-2 rounded-full border border-blue-200 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                onClick={onDownloadShare}
                disabled={isGeneratingImage}
                aria-label={t("share.download")}
              >
                <FaDownload className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="p-2 rounded-full border border-blue-200 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition disabled:opacity-60"
                onClick={onNativeShare}
                disabled={isGeneratingImage || nativeShareInProgress}
                aria-label={t("share.shareNative")}
              >
                <FaShareAlt className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="p-2 rounded-full border border-blue-200 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                onClick={() => {
                  onClose();
                  router.push(`/matches/${match.id}`);
                }}
                aria-label={t("share.reviewMatch")}
              >
                <FaEye className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="p-2 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800/40 transition text-gray-500 dark:text-gray-300"
                onClick={onClose}
                aria-label={t("share.close")}
              >
                <FaTimes className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {shareBanner && <AlertBanner variant={shareBanner.variant} message={shareBanner.text} />}

          {shareLoading ? (
            <AlertBanner variant="info" message={t("share.loadingVote")} />
          ) : userVote ? (
            <>
              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex justify-center items-center w-full">
                  <div ref={shareCardRef} className="flex justify-center">
                    <MatchShareCard match={match} locale={locale} vote={userVote} criteresDefs={criteresDefs} branding={shareBranding} />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3" />
            </>
          ) : (
            <AlertBanner
              variant="warning"
              title={t("share.noVote")}
              message={
                <button
                  type="button"
                  className="text-blue-600 underline dark:text-blue-300"
                  onClick={() => {
                    onClose();
                    router.push(`/matches/${match.id}`);
                  }}
                >
                  {t("share.cta.vote")}
                </button>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
