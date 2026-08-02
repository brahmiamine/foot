import { ReactNode } from "react";
import { CritereDefinition, Match, Vote } from "@/types";
import { useTranslations } from "@/lib/i18n";
import { AlertVariant } from "../ui/AlertBanner";
import { ShareBrandingInfo } from "../MatchShareCard";

export type TFunction = ReturnType<typeof useTranslations>["t"];

export interface MatchCardClientProps {
  match: Match;
  extraContent?: ReactNode;
  criteresDefs: CritereDefinition[];
  shareBranding?: ShareBrandingInfo | null;
  credibility?: number | null; // Crédibilité préchargée côté serveur
  totalVotes?: number; // Nombre de votes préchargé côté serveur
}

export interface ShareBannerState {
  variant: AlertVariant;
  text: string;
}

export type { Vote };
