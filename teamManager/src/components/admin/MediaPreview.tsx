"use client";

import { ImageWithFallback } from "@/components/ImageWithFallback";

/**
 * Media Preview Component
 * Displays a preview of a media item based on its type
 */
interface MediaPreviewProps {
  url: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO";
  altText?: string;
  className?: string;
}

export function MediaPreview({ url, type, altText, className = "" }: MediaPreviewProps) {
  switch (type) {
    case "IMAGE":
      return (
        <ImageWithFallback
          src={url}
          alt={altText || "Image preview"}
          className={`img-thumbnail ${className}`}
          style={{ maxWidth: "200px", maxHeight: "200px", objectFit: "cover" }}
          fallbackIcon="fas fa-image fa-2x"
        />
      );

    case "VIDEO":
      return (
        <video
          src={url}
          controls
          className={`img-thumbnail ${className}`}
          style={{ maxWidth: "200px", maxHeight: "200px" }}
        >
          Votre navigateur ne supporte pas la lecture vidéo.
        </video>
      );

    case "AUDIO":
      return (
        <audio src={url} controls className={className}>
          Votre navigateur ne supporte pas la lecture audio.
        </audio>
      );

    case "DOCUMENT":
      return (
        <div className={`d-flex align-items-center gap-2 ${className}`}>
          <i className="fas fa-file-alt fa-3x text-muted" aria-hidden="true" />
          <div>
            <div className="fw-bold">Document</div>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
              <small>Voir le document</small>
              <i className="fas fa-external-link-alt ms-1" aria-hidden="true" />
            </a>
          </div>
        </div>
      );

    default:
      return (
        <div className={`d-flex align-items-center gap-2 ${className}`}>
          <i className="fas fa-file fa-3x text-muted" aria-hidden="true" />
          <div>
            <div className="fw-bold">Fichier</div>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
              <small>Télécharger</small>
              <i className="fas fa-download ms-1" aria-hidden="true" />
            </a>
          </div>
        </div>
      );
  }
}

