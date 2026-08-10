"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Bannière d'installation PWA — même logique qu'arbinote/teamManager
 * (détection mobile, beforeinstallprompt Android/Chrome, instructions
 * manuelles iOS). Particulièrement utile ici : la feuille de match est
 * utilisée pitch-side sur mobile/tablette.
 */
export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const hasSeenPrompt = localStorage.getItem("pwa-install-prompt-dismissed");
    if (hasSeenPrompt === "true") {
      return;
    }

    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      return (
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase()) ||
        window.innerWidth < 768
      );
    };

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone || isIOSStandalone) {
      return;
    }

    if (!checkMobile()) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const timer = setTimeout(() => {
      if (checkMobile()) {
        setShowPrompt(true);
      }
    }, 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        localStorage.setItem("pwa-install-prompt-dismissed", "true");
        setShowPrompt(false);
      }

      setDeferredPrompt(null);
    } else {
      const userAgent = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/i.test(userAgent)) {
        alert(
          "Pour installer l'application sur iOS :\n\n1. Appuyez sur le bouton Partager (icône carrée avec flèche vers le haut)\n2. Faites défiler et sélectionnez 'Sur l'écran d'accueil'\n3. Appuyez sur 'Ajouter'"
        );
      } else if (/android/i.test(userAgent)) {
        alert(
          "Pour installer l'application sur Android :\n\n1. Appuyez sur le menu (3 points) en haut à droite\n2. Sélectionnez 'Installer l'application' ou 'Ajouter à l'écran d'accueil'\n3. Confirmez l'installation"
        );
      } else {
        alert(
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
    <div
      className="d-flex align-items-center justify-content-between gap-3 px-3 py-2 shadow-sm"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1060,
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <div className="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
        <Image src="/icon-192x192.png" alt="FTF Matchsheet" width={40} height={40} style={{ borderRadius: 8 }} />
        <div className="flex-grow-1 min-w-0">
          <p className="mb-0 small fw-semibold text-truncate">Installer FTF Matchsheet</p>
          <p className="mb-0 text-muted text-truncate" style={{ fontSize: "0.75rem" }}>
            Ajoutez l&apos;application à votre écran d&apos;accueil
          </p>
        </div>
      </div>
      <div className="d-flex align-items-center gap-2 flex-shrink-0">
        <button onClick={handleInstall} className="btn btn-danger btn-sm">
          Installer
        </button>
        <button onClick={handleDismiss} className="btn btn-sm btn-link text-muted" aria-label="Fermer">
          ×
        </button>
      </div>
    </div>
  );
}
