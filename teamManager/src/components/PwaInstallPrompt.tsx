"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "tm_pwa_install_dismissed";

/**
 * Bannière d'installation PWA : capture l'évènement `beforeinstallprompt`
 * (Chrome/Edge/Android) et propose d'installer TeamManager en app.
 * N'affiche rien sur les navigateurs qui ne déclenchent jamais cet évènement
 * (Safari/iOS notamment).
 */
interface PwaInstallPromptProps {
  /** Couleur d'accent du club connecté (résolue par lib/clubBranding.ts) — jamais hardcodée ici. */
  accentColor?: string;
}

export default function PwaInstallPrompt({ accentColor = "#c8102e" }: PwaInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(DISMISSED_KEY) === "1") return;

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !deferredPrompt) return null;

  const dismiss = () => {
    setVisible(false);
    window.sessionStorage.setItem(DISMISSED_KEY, "1");
  };

  const install = async () => {
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Installer TeamManager"
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 9999,
        maxWidth: 420,
        margin: "0 auto",
        background: "#171717",
        border: "1px solid #2a2a2a",
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        color: "#f5f2ee",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <span style={{ flex: 1, fontSize: 14 }}>Installer TeamManager sur cet appareil pour un accès rapide.</span>
      <button
        onClick={dismiss}
        style={{ background: "transparent", border: "none", color: "#8a8580", cursor: "pointer", fontSize: 13 }}
      >
        Plus tard
      </button>
      <button
        onClick={install}
        style={{
          background: accentColor,
          border: "none",
          color: "#fff",
          borderRadius: 6,
          padding: "8px 14px",
          fontSize: 13,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Installer
      </button>
    </div>
  );
}
