"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/lib/i18n";

interface LiveMatchBadgeProps {
  matchDate: string | Date | null | undefined;
}

export default function LiveMatchBadge({ matchDate }: LiveMatchBadgeProps) {
  const { t } = useTranslations();
  const [timeInfo, setTimeInfo] = useState<{ label: string; isLive: boolean; period: "1st" | "2nd" | "halftime" } | null>(null);

  useEffect(() => {
    if (!matchDate) {
      setTimeInfo(null);
      return;
    }

    const calculateTimeInfo = () => {
      const matchStartTime = typeof matchDate === "string" ? new Date(matchDate) : matchDate;
      const now = new Date();

      // Vérifier si le match a commencé (dans le passé ou maintenant)
      if (matchStartTime > now) {
        setTimeInfo(null);
        return;
      }

      // Calculer la différence en millisecondes
      const diffMs = now.getTime() - matchStartTime.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      // Un match de football dure généralement 90 minutes + temps additionnel (3 min max)
      // On considère que le match est en direct si moins de 93 minutes se sont écoulées (90 + 3 min max)
      if (diffMinutes > 93) {
        setTimeInfo(null);
        return;
      }

      let label = "";
      let period: "1st" | "2nd" | "halftime" = "1st";

      // Premier mi-temps (0-45 min)
      if (diffMinutes <= 45) {
        if (diffMinutes === 0) {
          label = "0' min";
        } else {
          label = `${diffMinutes}' min`;
        }
        period = "1st";
      }
      // Temps additionnel première mi-temps (45-48 min, assuming 3 min added time)
      else if (diffMinutes > 45 && diffMinutes <= 48) {
        const addedTime = diffMinutes - 45;
        label = `45' min + ${addedTime}`;
        period = "1st";
      }
      // Mi-temps (entre 48-63 min, assuming 15 min halftime + 3 min added time)
      else if (diffMinutes > 48 && diffMinutes <= 63) {
        label = t("common.halftime");
        period = "halftime";
      }
      // Deuxième mi-temps (63-108 min, assuming 45 min second half + 3 min added time)
      else if (diffMinutes > 63 && diffMinutes <= 108) {
        const secondHalfElapsed = diffMinutes - 63;
        if (secondHalfElapsed <= 45) {
          label = `${secondHalfElapsed}' min`;
        } else {
          // Second half additional time (after 45 min of second half)
          const secondHalfAddedTime = secondHalfElapsed - 45;
          label = `90' min + ${secondHalfAddedTime}`;
        }
        period = "2nd";
      }
      // Après le temps additionnel, le match est terminé
      else {
        setTimeInfo(null);
        return;
      }

      setTimeInfo(label ? { label, isLive: true, period } : null);
    };

    calculateTimeInfo();

    // Mettre à jour chaque minute
    const interval = setInterval(calculateTimeInfo, 60000);

    return () => clearInterval(interval);
  }, [matchDate, t]);

  if (!timeInfo || !timeInfo.isLive) {
    return null;
  }

  const periodLabel = timeInfo.period === "1st" ? t("common.firstHalf") : timeInfo.period === "halftime" ? "" : t("common.secondHalf");

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full animate-pulse">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        {t("common.live")}
      </span>
      {timeInfo.label && (
        <span className="text-xs font-medium text-red-600 dark:text-red-400">
          {timeInfo.label} {periodLabel && `(${periodLabel})`}
        </span>
      )}
    </div>
  );
}

