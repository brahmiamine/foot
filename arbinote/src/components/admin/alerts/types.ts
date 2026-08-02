export interface VoteAlert {
  id: string;
  match_id: string;
  alert_type: "critical" | "important";
  confidence: number;
  credibility: number;
  reasons: string[];
  status: "new" | "reviewed" | "resolved" | "dismissed";
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  notes?: string | null;
  match?: {
    id: string;
    date?: string | null;
  };
}

export interface AlertsResponse {
  alerts: VoteAlert[];
  total: number;
  limit: number;
  offset: number;
}
