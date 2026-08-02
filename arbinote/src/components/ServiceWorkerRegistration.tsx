"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      const registerServiceWorker = async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          });
          console.log("Service Worker enregistré avec succès:", registration.scope);
          
          // Vérifier les mises à jour
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("Nouveau Service Worker disponible");
                }
              });
            }
          });
        } catch (error) {
          console.log("Erreur lors de l'enregistrement du Service Worker:", error);
        }
      };

      // Enregistrer immédiatement si la page est déjà chargée
      if (document.readyState === "complete") {
        registerServiceWorker();
      } else {
        // Sinon attendre le chargement
        window.addEventListener("load", registerServiceWorker);
      }
    }
  }, []);

  return null;
}

