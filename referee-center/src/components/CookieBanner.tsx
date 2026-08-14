"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "@/lib/i18n";

const COOKIE_CONSENT_KEY = "referee-center-cookie-consent";

export default function CookieBanner() {
  const { t } = useTranslations();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà donné son consentement
    if (typeof window !== "undefined") {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        // Afficher la bannière après un court délai pour une meilleure UX
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleAccept = () => {
    if (typeof window !== "undefined") {
      // Stocker le consentement dans localStorage
      localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
      // Masquer la bannière
      setShowBanner(false);
    }
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-[10000] p-3 sm:p-4 md:p-5 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg animate-slide-up">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex-1 text-xs sm:text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
            <p>
              {t("cookieBanner.text")}{" "}
              <Link
                href="/politique-cookies"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline font-medium whitespace-nowrap"
              >
                {t("cookieBanner.learnMore")}
              </Link>
            </p>
          </div>
          <button onClick={handleAccept} className="btn-primary w-full sm:w-auto shrink-0 px-4 sm:px-6 py-2.5 sm:py-2 text-sm sm:text-base">
            {t("cookieBanner.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}

