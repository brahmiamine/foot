"use client";

import { useState, useEffect } from "react";
import CredibilityBadge from "./CredibilityBadge";

interface MatchCredibilityProps {
  matchId: string;
  className?: string;
  credibility?: number | null; // Crédibilité préchargée côté serveur
  totalVotes?: number; // Nombre de votes préchargé côté serveur
}

/**
 * Composant client qui charge et affiche la crédibilité d'un match
 * Si credibility et totalVotes sont fournis, ne fait pas de fetch
 */
export default function MatchCredibility({ 
  matchId, 
  className = "",
  credibility: preloadedCredibility,
  totalVotes: preloadedTotalVotes = 0,
}: MatchCredibilityProps) {
  const [credibility, setCredibility] = useState<number | null>(preloadedCredibility ?? null);
  const [totalVotes, setTotalVotes] = useState<number>(preloadedTotalVotes);
  const [loading, setLoading] = useState(preloadedCredibility === undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Si la crédibilité est déjà fournie, ne pas faire de fetch
    if (preloadedCredibility !== undefined) {
      setCredibility(preloadedCredibility);
      setTotalVotes(preloadedTotalVotes);
      setLoading(false);
      return;
    }

    // Sinon, charger depuis l'API
    const fetchCredibility = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/matches/${matchId}/credibility`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch credibility");
        }

        const data = await response.json();
        setCredibility(data.credibility);
        setTotalVotes(data.total_votes || 0);
        setError(false);
      } catch (err) {
        console.error("Error fetching credibility:", err);
        setError(true);
        // En cas d'erreur, on n'affiche pas le badge
      } finally {
        setLoading(false);
      }
    };

    fetchCredibility();
  }, [matchId, preloadedCredibility, preloadedTotalVotes]);

  // Ne rien afficher si en chargement, erreur, pas de crédibilité, ou pas de votes
  if (loading || error || credibility === null || totalVotes === 0) {
    return null;
  }

  return (
    <div className={className}>
      <CredibilityBadge credibility={credibility} size="sm" showLabel={false} />
    </div>
  );
}

