"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "@/lib/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const { t } = useTranslations();
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà fermé la bannière
    const hasSeenPrompt = localStorage.getItem("pwa-install-prompt-dismissed");
    if (hasSeenPrompt === "true") {
      return;
    }

    // Vérifier si on est sur mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobileDevice =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase()) || window.innerWidth < 768;
      setIsMobile(isMobileDevice);
      return isMobileDevice;
    };

    // Vérifier si l'app est déjà installée
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;

    if (isStandalone || isIOSStandalone) {
      return; // L'app est déjà installée
    }

    if (!checkMobile()) {
      return; // Pas sur mobile
    }

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Afficher la bannière automatiquement sur mobile après un court délai
    // (même sans l'événement beforeinstallprompt, notamment pour iOS)
    const timer = setTimeout(() => {
      if (checkMobile()) {
        setShowPrompt(true);
      }
    }, 2000); // Afficher après 2 secondes

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  // Ajouter un padding-top au body quand la bannière est visible
  useEffect(() => {
    if (showPrompt) {
      document.body.style.paddingTop = "66px";
    } else {
      document.body.style.paddingTop = "";
    }
    return () => {
      document.body.style.paddingTop = "";
    };
  }, [showPrompt]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Afficher le prompt d'installation (Android Chrome)
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        // L'utilisateur a accepté l'installation
        localStorage.setItem("pwa-install-prompt-dismissed", "true");
        setShowPrompt(false);
      }

      setDeferredPrompt(null);
    } else {
      // Pour iOS et autres navigateurs
      const userAgent = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/i.test(userAgent)) {
        // Instructions pour iOS
        alert(
          t("pwa.iosInstallInstructions") ||
            "Pour installer l'application sur iOS :\n\n1. Appuyez sur le bouton Partager (icône carrée avec flèche vers le haut)\n2. Faites défiler et sélectionnez 'Sur l'écran d'accueil'\n3. Appuyez sur 'Ajouter'"
        );
      } else if (/android/i.test(userAgent)) {
        // Instructions pour Android
        alert(
          t("pwa.androidInstallInstructions") ||
            "Pour installer l'application sur Android :\n\n1. Appuyez sur le menu (3 points) en haut à droite\n2. Sélectionnez 'Installer l'application' ou 'Ajouter à l'écran d'accueil'\n3. Confirmez l'installation"
        );
      } else {
        // Instructions génériques
        alert(
          t("pwa.genericInstallInstructions") ||
            "Pour installer l'application :\n\n1. Cherchez l'option 'Installer' ou 'Ajouter à l'écran d'accueil' dans le menu de votre navigateur\n2. Suivez les instructions à l'écran"
        );
      }
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa-install-prompt-dismissed", "true");
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 pt-1 pb-3 flex items-center justify-between gap-3">
        {/* Logo */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <Image
              src="/icon-512x512.png"
              alt="ARBINOTE"
              width={56}
              height={56}
              className="object-contain mx-auto"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{t("pwa.title") || "Installer ARBINOTE"}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {t("pwa.description") || "Ajoutez l'application à votre écran d'accueil"}
            </p>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstall}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors whitespace-nowrap"
          >
            {t("pwa.installButton") || "Installer"}
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label={t("pwa.closeButton") || "Fermer"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
