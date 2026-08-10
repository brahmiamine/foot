"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Le prototype Claude Design utilisait des `image-slot` avec libellé quand
 * aucune photo n'était encore fournie. On garde ce même filet de sécurité
 * visuel ici pour les entités DB dont `imageUrl`/`coverImage` est vide —
 * et aussi quand l'URL existe mais que le fichier a disparu (upload
 * supprimé/déplacé côté teamManager), au lieu de laisser un cadre vide.
 */
export function PlaceholderImage({
  src,
  alt,
  label,
  className,
}: {
  src?: string | null;
  alt: string;
  label: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <div className={className} style={{ position: "relative", overflow: "hidden" }}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{ objectFit: "cover" }}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1c1c1c",
        color: "var(--ob-text-faint)",
        fontFamily: "var(--ob-font-display)",
        fontSize: 13,
        letterSpacing: 1,
        textTransform: "uppercase",
        textAlign: "center",
        padding: 12,
      }}
    >
      {label}
    </div>
  );
}
