import { CritereDefinition } from "@/types";

export interface VoteFormProps {
  matchId: string;
  arbitreId: string;
  arbitreNom: string;
  criteresDefs: CritereDefinition[];
  matchStatus?: 'UPCOMING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED' | null;
  actualStartedAt?: string | null;
  onSuccess?: () => void;
}

export type CriteresState = Record<string, number>;
