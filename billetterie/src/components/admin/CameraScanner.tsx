"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { useI18n } from "@/i18n/I18nProvider";

/**
 * Lecture caméra du QR code d'un billet (avancement.md, rang 2). Complète
 * la douchette QR/code-barres et le collage manuel déjà en place dans
 * TicketScanner — n'importe lequel des trois peut nourrir le même flux de
 * scan (`onDetected`). Décodage 100% navigateur (`jsqr`, pas de dépendance
 * native ni d'appel réseau pour lire le code) sur les frames vidéo de
 * `getUserMedia`, avec un cooldown pour ne pas renvoyer le même jeton en
 * boucle tant que le porteur suivant n'est pas passé devant la caméra.
 */

const RESCAN_COOLDOWN_MS = 2500;

export function CameraScanner({ onDetected }: { onDetected: (token: string) => void }) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastDetectionRef = useRef<{ value: string; at: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setError(t("scanner.camera.unavailable"));
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setActive(true);
        tick();
      } catch {
        if (!cancelled) setError(t("scanner.camera.denied"));
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
      if (code?.data) {
        const now = Date.now();
        const last = lastDetectionRef.current;
        if (!last || last.value !== code.data || now - last.at > RESCAN_COOLDOWN_MS) {
          lastDetectionRef.current = { value: code.data, at: now };
          onDetected(code.data);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div
        style={{
          position: "relative",
          borderRadius: "var(--tk-radius-md)",
          overflow: "hidden",
          border: "1px solid var(--tk-border)",
          aspectRatio: "4 / 3",
          background: "#000",
        }}
      >
        <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        {!active && !error && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.85rem" }}>
            {t("scanner.camera.starting")}
          </div>
        )}
      </div>
      {error && (
        <p style={{ color: "var(--tk-danger)", fontSize: "0.8rem", marginTop: "0.5rem" }}>
          {error} {t("scanner.camera.fallback")}
        </p>
      )}
    </div>
  );
}
