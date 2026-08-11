"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { scanTicket, type ScanResultPayload } from "./actions";

interface EventOption {
  id: number;
  status: "OPEN" | "CLOSED";
  label: string;
}

const RESULT_CONFIG: Record<ScanResultPayload["result"], { label: string; className: string; icon: string }> = {
  VALID: { label: "VALIDE", className: "bg-success text-white", icon: "fa-check-circle" },
  ALREADY_USED: { label: "DÉJÀ UTILISÉ", className: "bg-warning text-dark", icon: "fa-exclamation-triangle" },
  CANCELLED: { label: "ANNULÉ", className: "bg-danger text-white", icon: "fa-ban" },
  INVALID: { label: "INVALIDE", className: "bg-danger text-white", icon: "fa-times-circle" },
  WRONG_EVENT: { label: "MAUVAIS MATCH", className: "bg-danger text-white", icon: "fa-times-circle" },
  EXPIRED: { label: "EXPIRÉ / NON ÉMIS", className: "bg-secondary text-white", icon: "fa-clock" },
};

function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  const key = "ob-ticketing-device-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function ScannerClient({ events, defaultGate }: { events: EventOption[]; defaultGate: string | null }) {
  const [eventId, setEventId] = useState<number | "">(events.find((e) => e.status === "OPEN")?.id ?? events[0]?.id ?? "");
  const [gate, setGate] = useState(defaultGate ?? "");
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [validating, setValidating] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const scanningRef = useRef(false);

  const submitToken = useCallback(
    async (token: string) => {
      if (!eventId) {
        setError("Choisissez d'abord un match");
        return;
      }
      setValidating(true);
      setError(null);
      try {
        const response = await scanTicket(eventId, token, gate || null, getDeviceId());
        if (response.success) {
          setResult(response.data);
        } else {
          setError(response.error);
        }
      } finally {
        setValidating(false);
      }
    },
    [eventId, gate]
  );

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const tickRef = useRef<() => void>(() => {});

  const tick = useCallback(() => {
    if (!scanningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          scanningRef.current = false;
          stopCamera();
          setScanning(false);
          submitToken(code.data);
          return;
        }
      }
    }
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, [stopCamera, submitToken]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setResult(null);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanningRef.current = true;
      setScanning(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setCameraError("Impossible d'accéder à la caméra. Utilisez la saisie manuelle ci-dessous.");
    }
  }, [tick]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const handleScanAgain = () => {
    setResult(null);
    setError(null);
    startCamera();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    await submitToken(manualToken.trim());
    setManualToken("");
  };

  const config = result ? RESULT_CONFIG[result.result] : null;

  return (
    <div className="container-fluid px-0" style={{ maxWidth: 480, margin: "0 auto" }}>
      <h1 className="h4 mb-3 text-center">Contrôle d&apos;entrée</h1>

      <div className="card mb-3">
        <div className="card-body">
          <label className="form-label small">Match</label>
          <select className="form-select mb-2" value={eventId} onChange={(e) => setEventId(e.target.value ? parseInt(e.target.value, 10) : "")}>
            <option value="">Choisir un match</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label} {e.status === "CLOSED" ? "(clôturée)" : ""}
              </option>
            ))}
          </select>
          <label className="form-label small">Porte</label>
          <input type="text" className="form-control" value={gate} onChange={(e) => setGate(e.target.value)} placeholder="Ex: Porte A" />
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-start">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}

      {result && config ? (
        <div className={`card mb-3 ${config.className}`}>
          <div className="card-body text-center py-5">
            <i className={`fas ${config.icon} mb-3`} style={{ fontSize: "3.5rem" }} aria-hidden="true" />
            <h2 className="h3 fw-bold mb-3">{config.label}</h2>
            {result.ticketNumber && <p className="mb-1">Billet {result.ticketNumber}</p>}
            {result.categoryName && <p className="mb-1">{result.categoryName}</p>}
            {result.holderName && <p className="mb-0">{result.holderName}</p>}
          </div>
        </div>
      ) : scanning ? (
        <div className="card mb-3">
          <div className="card-body p-2">
            <video ref={videoRef} muted playsInline className="w-100 rounded" style={{ maxHeight: 360, objectFit: "cover" }} />
            <canvas ref={canvasRef} className="d-none" />
            <button
              type="button"
              className="btn btn-outline-secondary w-100 mt-2"
              onClick={() => {
                stopCamera();
                setScanning(false);
              }}
            >
              Arrêter la caméra
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-primary btn-lg w-100 py-4 mb-3" onClick={startCamera} disabled={!eventId || validating}>
          <i className="fas fa-qrcode me-2" aria-hidden="true" />
          SCANNER QR
        </button>
      )}

      {result && (
        <button type="button" className="btn btn-primary btn-lg w-100 py-3 mb-3" onClick={handleScanAgain} disabled={!eventId}>
          Scanner un autre billet
        </button>
      )}

      {cameraError && <div className="alert alert-warning small">{cameraError}</div>}

      <div className="card">
        <div className="card-body">
          <label className="form-label small">Saisie manuelle du code</label>
          <form onSubmit={handleManualSubmit} className="d-flex gap-2">
            <input type="text" className="form-control" value={manualToken} onChange={(e) => setManualToken(e.target.value)} placeholder="Code du billet" />
            <button type="submit" className="btn btn-outline-primary" disabled={validating || !eventId}>
              Valider
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
