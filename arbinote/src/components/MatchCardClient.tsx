"use client";

import { MatchCardClientProps } from "./matchCard/types";
import { useMatchCardClient } from "./matchCard/useMatchCardClient";
import { MatchCardHeader } from "./matchCard/MatchCardHeader";
import { MatchCardTeams } from "./matchCard/MatchCardTeams";
import { MatchCardReferee } from "./matchCard/MatchCardReferee";
import { RefereePreviewModal } from "./matchCard/RefereePreviewModal";
import { ShareModal } from "./matchCard/ShareModal";

export default function MatchCardClient({ match, extraContent, criteresDefs, shareBranding, credibility, totalVotes }: MatchCardClientProps) {
  const {
    t,
    locale,
    router,
    isPreviewOpen,
    setPreviewOpen,
    isShareOpen,
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
  } = useMatchCardClient(match);

  return (
    <>
      <div
        role="link"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleCardClick();
          }
        }}
        className="block w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-3 sm:p-4 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md transition cursor-pointer"
      >
        <MatchCardHeader
          t={t}
          matchId={match.id}
          matchDate={match.date}
          journeeLabel={journeeLabel}
          dateLabel={dateLabel}
          credibility={credibility}
          totalVotes={totalVotes}
          canShare={canShare}
          onOpenShareModal={openShareModal}
        />
        <MatchCardTeams t={t} match={match} homeName={homeName} awayName={awayName} hasScore={hasScore} isMatchLive={isMatchLive} />
        <MatchCardReferee
          t={t}
          arbitre={match.arbitre}
          refereeName={refereeName}
          refereeCategory={refereeCategory}
          stopPropagation={stopPropagation}
          onOpenPreview={() => setPreviewOpen(true)}
        />
        {extraContent && <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">{extraContent}</div>}
      </div>
      {isPreviewOpen && match.arbitre?.photo_url && (
        <RefereePreviewModal
          arbitre={{ ...match.arbitre, photo_url: match.arbitre.photo_url }}
          refereeName={refereeName}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {isShareOpen && (
        <ShareModal
          t={t}
          locale={locale}
          router={router}
          match={match}
          criteresDefs={criteresDefs}
          shareBranding={shareBranding}
          shareCardRef={shareCardRef}
          shareBanner={shareBanner}
          shareLoading={shareLoading}
          userVote={userVote}
          isGeneratingImage={isGeneratingImage}
          nativeShareInProgress={nativeShareInProgress}
          onDownloadShare={handleDownloadShare}
          onNativeShare={handleNativeShare}
          onClose={closeShareModal}
        />
      )}
    </>
  );
}
