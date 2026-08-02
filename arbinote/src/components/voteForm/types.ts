import { CritereDefinition } from "@/types";

export interface VoteFormProps {
  matchId: string;
  arbitreId: string;
  arbitreNom: string;
  criteresDefs: CritereDefinition[];
  matchDate?: string | null;
  onSuccess?: () => void;
}

export type CriteresState = Record<string, number>;
