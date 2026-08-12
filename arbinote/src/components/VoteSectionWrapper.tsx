"use client";

import { useState } from "react";
import VoteForm from "./VoteForm";
import AlreadyVotedSection from "./AlreadyVotedSection";
import { CritereDefinition } from "@/types";

interface VoteSectionWrapperProps {
  matchId: string;
  arbitreId: string;
  arbitreNom: string;
  criteresDefs: CritereDefinition[];
  matchStatus?: 'UPCOMING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED' | null;
  actualStartedAt?: string | null;
}

export default function VoteSectionWrapper({
  matchId,
  arbitreId,
  arbitreNom,
  criteresDefs,
  matchStatus,
  actualStartedAt,
}: VoteSectionWrapperProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleVoteSuccess = () => {
    // Incrémenter le trigger pour forcer AlreadyVotedSection à se mettre à jour
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <>
      <VoteForm
        matchId={matchId}
        arbitreId={arbitreId}
        arbitreNom={arbitreNom}
        criteresDefs={criteresDefs}
        matchStatus={matchStatus}
        actualStartedAt={actualStartedAt}
        onSuccess={handleVoteSuccess}
      />
      <AlreadyVotedSection
        matchId={matchId}
        criteresDefs={criteresDefs}
        refreshTrigger={refreshTrigger}
      />
    </>
  );
}

