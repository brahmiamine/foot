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
  matchDate?: string | null;
}

export default function VoteSectionWrapper({
  matchId,
  arbitreId,
  arbitreNom,
  criteresDefs,
  matchDate,
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
        matchDate={matchDate}
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

