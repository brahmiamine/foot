import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { hasVotedAsync } from "@/lib/voteProtection";
import { useVote } from "@/contexts/VoteContext";
import { roundNote, canVoteMatch } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n";
import { CritereDefinition } from "@/types";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { defaultCritereDefinitions } from "@/lib/defaultCriteres";
import type { VoteFormProps, CriteresState } from "./types";

export function useVoteForm({ matchId, arbitreId, criteresDefs, matchDate, onSuccess }: VoteFormProps) {
  const { t, locale } = useTranslations();
  const router = useRouter();
  const { refreshVotedMatches } = useVote();
  const criteresList = criteresDefs.length ? criteresDefs : defaultCritereDefinitions;

  const canVote = useMemo(() => {
    return canVoteMatch({ arbitre_id: arbitreId, date: matchDate });
  }, [arbitreId, matchDate]);

  const emptyState = useMemo(() => {
    return criteresList.reduce<CriteresState>((acc, critere) => {
      acc[critere.id] = 0;
      return acc;
    }, {});
  }, [criteresList]);

  const groupedByCategory = useMemo(() => {
    return criteresList.reduce<Record<string, CritereDefinition[]>>((acc, critere) => {
      acc[critere.categorie] = acc[critere.categorie] || [];
      acc[critere.categorie].push(critere);
      return acc;
    }, {});
  }, [criteresList]);

  const [criteres, setCriteres] = useState<CriteresState>(emptyState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [checkingVote, setCheckingVote] = useState(true);

  useEffect(() => {
    setCriteres(emptyState);
  }, [emptyState]);

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

  // Vérifier si l'utilisateur a déjà voté (base de données uniquement)
  useEffect(() => {
    const checkVote = async () => {
      setCheckingVote(true);
      const voted = await hasVotedAsync(matchId, fingerprint);
      setAlreadyVoted(voted);
      setCheckingVote(false);
    };

    // Attendre que le fingerprint soit chargé avant de vérifier
    if (fingerprint !== null) {
      checkVote();
    } else {
      // Si pas de fingerprint, on ne peut pas vérifier
      setAlreadyVoted(false);
      setCheckingVote(false);
    }
  }, [matchId, fingerprint]);

  // Calculer le temps restant avant de pouvoir voter (doit être avant tout return conditionnel)
  const timeUntilCanVote = useMemo(() => {
    if (!matchDate || canVote) return null;

    try {
      const matchStartDate = new Date(matchDate);
      const now = new Date();

      if (matchStartDate > now) return null; // Match pas encore commencé

      const diffMs = now.getTime() - matchStartDate.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffMinutes < 30) {
        return 30 - diffMinutes;
      }
    } catch {
      return null;
    }

    return null;
  }, [matchDate, canVote]);

  const calculateNoteGlobale = (crits: CriteresState): number => {
    const values = Object.values(crits).filter((v) => v > 0);
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return roundNote(sum / values.length);
  };

  const noteGlobale = calculateNoteGlobale(criteres);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canVote) {
      setError(t("voteForm.errorCannotVote"));
      return;
    }

    const allFilled = criteresList.every((critere) => criteres[critere.id] > 0);
    if (!allFilled) {
      setError(t("voteForm.errorIncomplete"));
      return;
    }

    if (!fingerprint) {
      setError(t("common.error"));
      return;
    }

    // Vérifier à nouveau si déjà voté (double vérification)
    const hasVotedNow = await hasVotedAsync(matchId, fingerprint);
    if (hasVotedNow) {
      setError(t("voteForm.errorAlreadyVoted"));
      setAlreadyVoted(true);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const noteGlobale = calculateNoteGlobale(criteres);

    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          match_id: matchId,
          arbitre_id: arbitreId,
          criteres,
          note_globale: noteGlobale,
          device_fingerprint: fingerprint,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("common.error"));
      }

      setSuccess(true);
      setShowSuccessModal(true);

      // Rafraîchir la liste des matchs votés dans le contexte
      await refreshVotedMatches();

      // Scroll to top on mobile for better UX
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccessModal = useCallback(() => {
    setShowSuccessModal(false);
    router.refresh();
    if (onSuccess) {
      onSuccess();
    }
  }, [router, onSuccess]);

  return {
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
  };
}
