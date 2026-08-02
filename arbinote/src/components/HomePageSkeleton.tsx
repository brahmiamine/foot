"use client";

import { useEffect, useState } from "react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import MatchCardSkeleton from "./MatchCardSkeleton";

/**
 * Skeleton loader complet pour la page home
 * Reproduit le design exact de la page avec header, dropdown et cards
 */
export default function HomePageSkeleton() {
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
      <section className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Header avec titre et dropdown */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            {/* Label "Liste des matchs" */}
            <Skeleton width={120} height={14} />
            {/* Titre de la journée */}
            <div className="flex items-center gap-3 flex-wrap">
              <Skeleton width={200} height={32} className="sm:w-64 sm:h-9" />
              <Skeleton width={100} height={20} />
            </div>
            {/* Date de la journée */}
            <Skeleton width={150} height={16} />
          </div>
          {/* Dropdown de sélection */}
          <div className="w-full sm:w-72">
            <Skeleton width={120} height={20} className="mb-2" />
            <Skeleton width="100%" height={44} borderRadius="1rem" />
          </div>
        </div>

        {/* Cards de match */}
        <div className="space-y-6 sm:space-y-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <MatchCardSkeleton key={index} />
          ))}
        </div>
      </section>
    </SkeletonTheme>
  );
}

