"use client";

import { useEffect, useState } from "react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

/**
 * Skeleton loader complet pour la page classement
 * Reproduit le design exact de la page avec header, classements et top matchs
 */
export default function ClassementPageSkeleton() {
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
      <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Skeleton width={250} height={36} className="sm:w-80 sm:h-9" />
          </div>
        </div>

        {/* Classement par journée */}
        <section className="space-y-4 sm:space-y-6">
          <div>
            <Skeleton width={300} height={28} className="sm:w-96 sm:h-8 mb-2" />
            <Skeleton width={400} height={16} className="sm:w-96" />
          </div>

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {/* Carte classement 1 */}
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div>
                  <Skeleton width={80} height={12} className="mb-1" />
                  <Skeleton width={150} height={20} className="sm:w-48 sm:h-6" />
                </div>
              </div>
              <ul className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <li key={index} className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <Skeleton width={32} height={32} borderRadius="50%" />
                    <div className="flex-1 min-w-0">
                      <Skeleton width={120} height={16} className="sm:w-48" />
                      <Skeleton width={80} height={12} className="mt-1" />
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <Skeleton width={48} height={20} className="sm:w-16 sm:h-6 mb-1" />
                      <Skeleton width={64} height={12} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Carte classement 2 */}
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div>
                  <Skeleton width={80} height={12} className="mb-1" />
                  <Skeleton width={150} height={20} className="sm:w-48 sm:h-6" />
                </div>
              </div>
              <ul className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <li key={index} className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <Skeleton width={32} height={32} borderRadius="50%" />
                    <div className="flex-1 min-w-0">
                      <Skeleton width={120} height={16} className="sm:w-48" />
                      <Skeleton width={80} height={12} className="mt-1" />
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <Skeleton width={48} height={20} className="sm:w-16 sm:h-6 mb-1" />
                      <Skeleton width={64} height={12} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Top matchs VAR et Assistants */}
        <section className="space-y-6">
          <div>
            <Skeleton width={200} height={28} className="sm:w-64 sm:h-8" />
          </div>

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {/* Top 5 matchs VAR */}
            <div className="rounded-xl sm:rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 shadow-sm">
              <div className="mb-3 sm:mb-4">
                <Skeleton width={120} height={12} className="mb-1" />
                <Skeleton width={200} height={24} className="sm:w-64 sm:h-7" />
              </div>
              <ul className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <li key={index} className="rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 px-3 sm:px-4 py-2 sm:py-3">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Skeleton width={32} height={16} />
                        <Skeleton width={80} height={12} />
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <Skeleton width={48} height={20} className="sm:w-16 sm:h-6 mb-1" />
                        <Skeleton width={64} height={12} />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2 mb-2">
                      <Skeleton width={100} height={14} className="sm:w-32" />
                      <Skeleton width={48} height={14} />
                      <Skeleton width={100} height={14} className="sm:w-32" />
                    </div>
                    <Skeleton width={80} height={12} />
                  </li>
                ))}
              </ul>
            </div>

            {/* Top 5 matchs Assistants */}
            <div className="rounded-xl sm:rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 shadow-sm">
              <div className="mb-3 sm:mb-4">
                <Skeleton width={120} height={12} className="mb-1" />
                <Skeleton width={200} height={24} className="sm:w-64 sm:h-7" />
              </div>
              <ul className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <li key={index} className="rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 px-3 sm:px-4 py-2 sm:py-3">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Skeleton width={32} height={16} />
                        <Skeleton width={80} height={12} />
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <Skeleton width={48} height={20} className="sm:w-16 sm:h-6 mb-1" />
                        <Skeleton width={64} height={12} />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2 mb-2">
                      <Skeleton width={100} height={14} className="sm:w-32" />
                      <Skeleton width={48} height={14} />
                      <Skeleton width={100} height={14} className="sm:w-32" />
                    </div>
                    <Skeleton width={80} height={12} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </SkeletonTheme>
  );
}

