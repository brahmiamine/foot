"use client";

import { useState } from "react";
import type { ImgHTMLAttributes } from "react";

interface ImageWithFallbackProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** FontAwesome class shown instead of the image when it is missing or fails to load. */
  fallbackIcon?: string;
}

/**
 * Wraps a plain <img> and swaps to an icon placeholder if `src` is empty or
 * the image fails to load (deleted/moved upload, broken URL...) instead of
 * leaving the browser's default broken-image icon on screen.
 */
export function ImageWithFallback({
  src,
  alt,
  className,
  style,
  fallbackIcon = "fas fa-image",
  onError,
  ...rest
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`d-flex align-items-center justify-content-center bg-secondary text-white ${className ?? ""}`}
        style={style}
        role="img"
        aria-label={alt || "Image indisponible"}
      >
        <i className={fallbackIcon} aria-hidden="true" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
      {...rest}
    />
  );
}
