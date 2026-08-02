"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/lib/i18n";
import { CritereDefinition } from "@/types";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import UserVoteDisplay from "./UserVoteDisplay";
import AlertBanner from "./ui/AlertBanner";

interface AlreadyVotedSectionProps {
  matchId: string;
  criteresDefs: CritereDefinition[];
  refreshTrigger?: number;
}

export default function AlreadyVotedSection({
  matchId,
  criteresDefs,
  refreshTrigger,
}: AlreadyVotedSectionProps) {
  const { t } = useTranslations();
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => {
        if (!cancelled) {
          setFingerprint(result.visitorId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFingerprint(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Si pas de fingerprint, on ne peut pas vérifier
    if (!fingerprint) {
      setLoading(false);
      setHasVoted(false);
      return;
    }

    // Toujours vérifier dans la base de données (source de vérité unique)
    const checkVote = async () => {
      try {
        const response = await fetch(`/api/votes/${matchId}/user?fingerprint=${fingerprint}`);
        if (response.ok) {
          const voteData = await response.json();
          setHasVoted(true);
          setUserVote(voteData);
        } else if (response.status === 404) {
          // Si pas dans la DB, l'utilisateur n'a pas voté
          setHasVoted(false);
          setUserVote(null);
        } else {
          // Autre erreur HTTP
          setHasVoted(false);
          setUserVote(null);
        }
      } catch (error) {
        console.error("Error checking vote:", error);
        // En cas d'erreur réseau, on ne considère pas qu'il a voté
        setHasVoted(false);
        setUserVote(null);
      } finally {
        setLoading(false);
      }
    };

    checkVote();
  }, [matchId, fingerprint, refreshTrigger]);

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mb-6">
        <p className="text-gray-600 dark:text-gray-400">{t("common.loading")}</p>
      </div>
    );
  }

  if (!hasVoted) {
    return null;
  }

  return (
    <>
      {/* Mes votes */}
      {criteresDefs && criteresDefs.length > 0 ? (
        <UserVoteDisplay matchId={matchId} criteresDefs={criteresDefs} initialVote={userVote} fingerprint={fingerprint} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{t("matchDetail.myVotes")}</h2>
          <AlertBanner variant="warning" message="Aucun critère défini. Veuillez contacter l'administrateur." />
        </div>
      )}
    </>
  );
}
