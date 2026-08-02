"use client";

import { useEffect } from "react";

export default function FontAwesomeLoader() {
  useEffect(() => {
    // Vérifier si le lien Font Awesome existe déjà
    const existingLink = document.querySelector('link[href*="font-awesome"]');
    
    if (!existingLink) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css";
      link.integrity = "sha512-Avb2QiuDEEvB4bZJYdft2mNjVShBftLdPG8FJ0V7irTLQ8Uo0qcPxh4Plq7G5tGm0rU+1SPhVotteLpBERwTkw==";
      link.crossOrigin = "anonymous";
      link.referrerPolicy = "no-referrer";
      document.head.appendChild(link);
    }
  }, []);

  return null;
}

