"use client";

import { useEffect, useState } from "react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

/**
 * Skeleton loader pour les cartes de match
 * Reproduit le design exact de MatchCardClient
 */
export default function MatchCardSkeleton() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Détecter le thème actuel
    const checkTheme = () => {
      if (typeof window !== "undefined") {
        const isDarkMode =
          document.documentElement.classList.contains("dark") ||
          window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDark(isDarkMode);
      }
    };

    checkTheme();

    // Observer les changements de thème
    const observer = new MutationObserver(checkTheme);
    if (typeof document !== "undefined") {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    // Observer les changements de préférence système
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => checkTheme();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return (
    <SkeletonTheme
      baseColor={isDark ? "#374151" : "#d1d5db"}
      highlightColor={isDark ? "#4b5563" : "#e5e7eb"}
      borderRadius="0.5rem"
      duration={1.5}
    >
      <div className="block w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-3 sm:p-4">
        {/* Header avec date et journée */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs uppercase text-gray-400 dark:text-gray-500 mb-4 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton width={80} height={16} />
            <Skeleton width={64} height={16} />
            <Skeleton width={64} height={20} borderRadius="9999px" />
            <Skeleton width={80} height={20} borderRadius="9999px" />
            <Skeleton width={64} height={20} borderRadius="9999px" />
          </div>
          <Skeleton width={96} height={24} borderRadius="9999px" />
        </div>

        {/* Équipes et score */}
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-0">
          {/* Équipe domicile */}
          <div className="flex flex-1 flex-col items-center text-center gap-1 min-w-0">
            <Skeleton
              width={40}
              height={40}
              borderRadius="50%"
              className="sm:w-12 sm:h-12"
            />
            <Skeleton width={96} height={14} className="sm:w-28 sm:h-16" />
          </div>
          {/* Score au centre */}
          <div className="flex min-w-[60px] sm:min-w-[80px] flex-col items-center justify-center text-center flex-shrink-0">
            <Skeleton width={64} height={24} className="sm:w-20 sm:h-7 mb-1" />
            <Skeleton width={48} height={12} />
          </div>
          {/* Équipe extérieure */}
          <div className="flex flex-1 flex-col items-center text-center gap-1 min-w-0">
            <Skeleton
              width={40}
              height={40}
              borderRadius="50%"
              className="sm:w-12 sm:h-12"
            />
            <Skeleton width={96} height={14} className="sm:w-28 sm:h-16" />
          </div>
        </div>

        {/* Stats de vote - extraContent */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Skeleton width={96} height={28} borderRadius="9999px" />
          <Skeleton width={96} height={28} borderRadius="9999px" />
          <Skeleton width={96} height={28} borderRadius="9999px" />
          <Skeleton width={96} height={28} borderRadius="9999px" />
          <Skeleton width={80} height={16} className="ml-auto" />
        </div>

        {/* Arbitre */}
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 sm:mt-3 flex flex-col gap-2">
          <Skeleton width={64} height={12} />
          <div className="flex items-center gap-3">
            <Skeleton width={48} height={48} borderRadius="50%" />
            <div className="flex flex-col gap-1">
              <Skeleton width={128} height={16} />
              <Skeleton width={96} height={12} />
            </div>
          </div>
        </div>
      </div>
    </SkeletonTheme>
  );
}

