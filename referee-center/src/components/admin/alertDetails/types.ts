import type { VoteAnomalyResult } from "@/lib/voteAnomalyDetection";

export interface Vote {
  id: string;
  note_globale: number;
  criteres: Record<string, number>;
  created_at: string;
  device_fingerprint?: string | null;
  ip_address?: string | null;
  moderation_status?: "pending" | "validated" | "excluded";
  moderated_at?: string | null;
  moderated_by?: string | null;
  moderation_notes?: string | null;
}

export interface MatchDetails {
  id: string;
  date?: string | null;
  arbitre?: {
    id: string;
    nom: string;
  } | null;
  equipe_home?: {
    id: string;
    nom: string;
  } | null;
  equipe_away?: {
    id: string;
    nom: string;
  } | null;
}

export interface AlertDetails {
  match: MatchDetails;
  votes: Vote[];
  anomaly: {
    isSuspicious: boolean;
    confidence: number;
    reasons: string[];
    details: VoteAnomalyResult["details"];
  };
  credibility: number;
  moderationStats: {
    pending: number;
    validated: number;
    excluded: number;
  };
  totalVotes: number;
}

/** Une entrée d'historique de modération (US-40) — reconstruite depuis audit_logs. */
export interface AlertHistoryEntry {
  id: string;
  action: string;
  summary?: string | null;
  admin_username?: string | null;
  created_at: string;
}
