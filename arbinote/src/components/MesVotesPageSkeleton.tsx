"use client";

import { useEffect, useState } from "react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import MatchCardSkeleton from "./MatchCardSkeleton";

/**
 * Skeleton loader complet pour la page mes votes
 * Reproduit le design exact de la page avec header, groupes par journée et cartes de match
 */
export default function MesVotesPageSkeleton() {
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
      <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-10 space-y-6 sm:space-y-8">
        {/* Titre */}
        <Skeleton width={200} height={36} className="sm:w-64 sm:h-9" />

        {/* Groupes par journée - Afficher 2 groupes */}
        {Array.from({ length: 2 }).map((_, groupIndex) => (
          <div key={groupIndex} className="space-y-3 sm:space-y-4">
            {/* Header de journée */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 dark:border-gray-700 pb-2 gap-2">
              <div className="min-w-0 flex-1">
                <Skeleton width={250} height={28} className="sm:w-80 sm:h-8 mb-1" />
                <Skeleton width={150} height={16} />
              </div>
              <Skeleton width={100} height={20} />
            </div>

            {/* Cartes de match - Afficher 2-3 cartes par groupe */}
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, cardIndex) => (
                <MatchCardSkeleton key={cardIndex} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </SkeletonTheme>
  );
}

