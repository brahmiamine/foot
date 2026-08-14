"use client";

import { useState } from "react";
import { useTranslations } from "@/lib/i18n";
import { FaTimes } from "react-icons/fa";

interface CredibilityBadgeProps {
  credibility: number; // 0-100
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

/**
 * Badge affichant le niveau de crédibilité d'un match ou d'un arbitre
 * Basé sur la détection d'anomalies statistiques
 */
export default function CredibilityBadge({
  credibility,
  size = "md",
  showLabel = true,
  className = "",
}: CredibilityBadgeProps) {
  const { t } = useTranslations();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Déterminer la couleur et le label selon le niveau de crédibilité
  const getCredibilityInfo = (cred: number) => {
    if (cred >= 80) {
      return {
        color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700",
        label: t("credibility.high"),
        icon: "✓",
        level: "high",
      };
    } else if (cred >= 60) {
      return {
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
        label: t("credibility.medium"),
        icon: "⚠",
        level: "medium",
      };
    } else if (cred >= 40) {
      return {
        color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300 dark:border-orange-700",
        label: t("credibility.low"),
        icon: "⚠",
        level: "low",
      };
    } else {
      return {
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700",
        label: t("credibility.veryLow"),
        icon: "✗",
        level: "veryLow",
      };
    }
  };

  const info = getCredibilityInfo(credibility);
  const sizeClasses = {
    sm: "text-xs px-2.5 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  const getLevelInfo = () => {
    switch (info.level) {
      case "high":
        return {
          title: t("credibility.modal.high.title"),
          description: t("credibility.modal.high.description"),
        };
      case "medium":
        return {
          title: t("credibility.modal.medium.title"),
          description: t("credibility.modal.medium.description"),
        };
      case "low":
        return {
          title: t("credibility.modal.low.title"),
          description: t("credibility.modal.low.description"),
        };
      case "veryLow":
        return {
          title: t("credibility.modal.veryLow.title"),
          description: t("credibility.modal.veryLow.description"),
        };
      default:
        return {
          title: t("credibility.modal.high.title"),
          description: t("credibility.modal.high.description"),
        };
    }
  };

  const levelInfo = getLevelInfo();

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(true);
        }}
        className={`inline-flex items-center gap-1 rounded-full border font-medium cursor-pointer hover:opacity-80 transition-opacity ${sizeClasses[size]} ${info.color} ${className}`}
        title={t("credibility.tooltip", { percentage: Math.round(credibility) })}
      >
        <span className="text-xs">{info.icon}</span>
        {showLabel && <span>{info.label}</span>}
        <span className="font-semibold">{Math.round(credibility)}%</span>
      </button>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4"
          onClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(false);
          }}
        >
          <div
            className="relative bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-3 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton fermer */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              aria-label={t("credibility.modal.close")}
            >
              <FaTimes className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Contenu */}
            <div className="space-y-3 sm:space-y-4">
              {/* Header */}
              <div className="pr-8 sm:pr-10">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
                  {t("credibility.modal.title")}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  {t("credibility.modal.description")}
                </p>
              </div>

              {/* Score actuel */}
              <div className={`rounded-lg sm:rounded-xl p-2.5 sm:p-4 border-2 ${info.color}`}>
                <div className="flex items-start gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                  <span className="text-lg sm:text-2xl flex-shrink-0">{info.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm sm:text-lg mb-0.5">{levelInfo.title}</p>
                    <p className="text-xs sm:text-sm opacity-90 leading-tight">{levelInfo.description}</p>
                  </div>
                </div>
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-current/20">
                  <p className="text-xs sm:text-sm font-medium mb-1">
                    {t("credibility.modal.howItWorks")}
                  </p>
                  <p className="text-xs sm:text-sm opacity-90 leading-tight">
                    {t("credibility.modal.howItWorksText")}
                  </p>
                </div>
              </div>

              {/* Niveaux de crédibilité */}
              <div className="space-y-2 sm:space-y-3">
                <div className="rounded-lg p-2.5 sm:p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="font-semibold text-xs sm:text-sm text-green-900 dark:text-green-200 mb-0.5">
                    {t("credibility.modal.high.title")}
                  </p>
                  <p className="text-xs text-green-800 dark:text-green-300 leading-tight">
                    {t("credibility.modal.high.description")}
                  </p>
                </div>
                <div className="rounded-lg p-2.5 sm:p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <p className="font-semibold text-xs sm:text-sm text-yellow-900 dark:text-yellow-200 mb-0.5">
                    {t("credibility.modal.medium.title")}
                  </p>
                  <p className="text-xs text-yellow-800 dark:text-yellow-300 leading-tight">
                    {t("credibility.modal.medium.description")}
                  </p>
                </div>
                <div className="rounded-lg p-2.5 sm:p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                  <p className="font-semibold text-xs sm:text-sm text-orange-900 dark:text-orange-200 mb-0.5">
                    {t("credibility.modal.low.title")}
                  </p>
                  <p className="text-xs text-orange-800 dark:text-orange-300 leading-tight">
                    {t("credibility.modal.low.description")}
                  </p>
                </div>
                <div className="rounded-lg p-2.5 sm:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="font-semibold text-xs sm:text-sm text-red-900 dark:text-red-200 mb-0.5">
                    {t("credibility.modal.veryLow.title")}
                  </p>
                  <p className="text-xs text-red-800 dark:text-red-300 leading-tight">
                    {t("credibility.modal.veryLow.description")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

