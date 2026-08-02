"use client";

import VoteStatsPreview from "./VoteStatsPreview";
import AlertBanner from "./ui/AlertBanner";
import CriteriaGroup from "./voteForm/CriteriaGroup";
import SuccessModal from "./voteForm/SuccessModal";
import { useVoteForm } from "./voteForm/useVoteForm";
import type { VoteFormProps } from "./voteForm/types";

export default function VoteForm({ matchId, arbitreId, arbitreNom, criteresDefs, matchDate, onSuccess }: VoteFormProps) {
  const {
    t,
    locale,
    criteresList,
    canVote,
    groupedByCategory,
    criteres,
    setCriteres,
    isSubmitting,
    error,
    success,
    showSuccessModal,
    alreadyVoted,
    checkingVote,
    timeUntilCanVote,
    noteGlobale,
    handleSubmit,
    handleCloseSuccessModal,
  } = useVoteForm({ matchId, arbitreId, arbitreNom, criteresDefs, matchDate, onSuccess });

  // Afficher un loader pendant la vérification
  if (checkingVote) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <AlertBanner variant="info" message={t("common.loading")} />
      </div>
    );
  }

  if (alreadyVoted) {
    // Ne rien afficher si déjà voté, les composants UserVoteDisplay et VotesComparison s'afficheront
    return null;
  }

  if (success && !showSuccessModal) {
    // Vote réussi mais modal fermé - ne rien afficher
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-6 mb-6 w-full max-w-full overflow-x-hidden">
      <VoteStatsPreview matchId={matchId} criteresDefs={criteresList} />
      <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-900 dark:text-white">{t("matchDetail.voteTitle")}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <AlertBanner
          variant="info"
          message={
            <>
              {t("voteForm.intro")} <strong className="font-semibold">{arbitreNom}</strong>
            </>
          }
        />

        {!canVote && timeUntilCanVote !== null && (
          <AlertBanner
            variant="warning"
            message={
              t("voteForm.waitToVote", { minutes: timeUntilCanVote }) ||
              `Veuillez attendre encore ${timeUntilCanVote} minute(s) après le début du match avant de pouvoir voter.`
            }
          />
        )}

        {error && (
          <AlertBanner variant="error" message={error} />
        )}

        <div className="space-y-4 sm:space-y-6">
          {Object.entries(groupedByCategory).map(([categorie, list]) => (
            <CriteriaGroup
              key={categorie}
              categorie={categorie}
              list={list}
              criteres={criteres}
              setCriteres={setCriteres}
              locale={locale}
              t={t}
            />
          ))}
        </div>

        {noteGlobale > 0 && (
          <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700 dark:text-gray-300 text-sm sm:text-base">{t("voteForm.noteGlobal")}:</span>
              <span className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{noteGlobale.toFixed(2)}/5</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || noteGlobale === 0 || !canVote}
          className="btn-primary w-full py-3 px-6"
        >
          {isSubmitting ? t("voteForm.submitting") : t("voteForm.submit")}
        </button>
      </form>

      {/* Modal de félicitation après vote réussi */}
      {showSuccessModal && (
        <SuccessModal t={t} onClose={handleCloseSuccessModal} />
      )}
    </div>
  );
}
