"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";

type Step = "idle" | "enrolling" | "recovery-codes" | "enabled";

export default function MfaSetupForm({ initialEnabled }: { initialEnabled: boolean }) {
  const [step, setStep] = useState<Step>(initialEnabled ? "enabled" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [secret, setSecret] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const [disablePassword, setDisablePassword] = useState("");

  async function startEnrollment() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/mfa/setup", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Impossible de démarrer l'activation");
      }
      setSecret(payload.secret);
      setQrCodeDataUrl(payload.qrCodeDataUrl);
      setStep("enrolling");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de démarrer l'activation");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/mfa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, code: confirmCode }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Code invalide");
      }
      setRecoveryCodes(payload.recoveryCodes);
      setStep("recovery-codes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Impossible de désactiver la MFA");
      }
      setDisablePassword("");
      setStep("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de désactiver la MFA");
    } finally {
      setLoading(false);
    }
  }

  if (step === "recovery-codes") {
    return (
      <div className="sso-form">
        <p className="sso-success">
          MFA activée. Conservez ces codes de récupération dans un endroit sûr — ils ne seront
          plus jamais affichés et permettent de vous connecter si vous perdez l&apos;accès à votre
          application d&apos;authentification.
        </p>
        <pre className="sso-codes">{recoveryCodes.join("\n")}</pre>
        <button type="button" className="sso-submit" onClick={() => setStep("enabled")}>
          J&apos;ai noté mes codes
        </button>
        <style jsx>{`
          .sso-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .sso-success {
            color: var(--sso-text);
            font-size: 0.9375rem;
            margin: 0;
          }
          .sso-codes {
            background: var(--sso-bg);
            border: 1px solid var(--sso-border);
            border-radius: 8px;
            padding: 12px;
            font-size: 0.875rem;
            line-height: 1.6;
          }
          .sso-submit {
            background: var(--sso-accent);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px;
            font-weight: 600;
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  if (step === "enrolling") {
    return (
      <form onSubmit={handleConfirm} className="sso-form">
        <p className="sso-muted">
          Scannez ce QR code avec votre application d&apos;authentification, puis saisissez le
          code à 6 chiffres généré pour confirmer.
        </p>
        {qrCodeDataUrl && (
          <Image src={qrCodeDataUrl} alt="QR code MFA" width={200} height={200} unoptimized />
        )}
        <p className="sso-secret">Secret manuel : {secret}</p>

        <div className="sso-field">
          <label htmlFor="confirmCode">Code de vérification</label>
          <input
            id="confirmCode"
            type="text"
            inputMode="numeric"
            value={confirmCode}
            onChange={(event) => setConfirmCode(event.target.value)}
            required
          />
        </div>

        {error && <p className="sso-error">{error}</p>}

        <button type="submit" disabled={loading} className="sso-submit">
          {loading ? "Vérification..." : "Confirmer et activer"}
        </button>
        <button type="button" className="sso-switch" onClick={() => setStep("idle")}>
          Annuler
        </button>

        <style jsx>{`
          .sso-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .sso-muted {
            color: var(--sso-muted);
            font-size: 0.875rem;
            margin: 0;
          }
          .sso-secret {
            font-family: monospace;
            font-size: 0.8125rem;
            color: var(--sso-muted);
            word-break: break-all;
          }
          .sso-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .sso-field label {
            font-size: 0.8125rem;
            color: var(--sso-muted);
          }
          .sso-field input {
            background: var(--sso-bg);
            border: 1px solid var(--sso-border);
            border-radius: 8px;
            padding: 10px 12px;
            color: var(--sso-text);
            font-size: 0.9375rem;
          }
          .sso-error {
            color: var(--sso-error);
            font-size: 0.875rem;
            margin: 0;
          }
          .sso-submit {
            background: var(--sso-accent);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px;
            font-weight: 600;
            cursor: pointer;
          }
          .sso-submit:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .sso-switch {
            background: none;
            border: none;
            color: var(--sso-muted);
            font-size: 0.8125rem;
            cursor: pointer;
            text-decoration: underline;
          }
        `}</style>
      </form>
    );
  }

  if (step === "enabled") {
    return (
      <form onSubmit={handleDisable} className="sso-form">
        <p className="sso-success">✓ MFA activée sur ce compte.</p>
        <div className="sso-field">
          <label htmlFor="disablePassword">Mot de passe (pour désactiver)</label>
          <input
            id="disablePassword"
            type="password"
            value={disablePassword}
            onChange={(event) => setDisablePassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && <p className="sso-error">{error}</p>}
        <button type="submit" disabled={loading} className="sso-submit sso-submit-danger">
          {loading ? "Désactivation..." : "Désactiver la MFA"}
        </button>
        <style jsx>{`
          .sso-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .sso-success {
            color: var(--sso-text);
            font-size: 0.9375rem;
            margin: 0;
          }
          .sso-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .sso-field label {
            font-size: 0.8125rem;
            color: var(--sso-muted);
          }
          .sso-field input {
            background: var(--sso-bg);
            border: 1px solid var(--sso-border);
            border-radius: 8px;
            padding: 10px 12px;
            color: var(--sso-text);
            font-size: 0.9375rem;
          }
          .sso-error {
            color: var(--sso-error);
            font-size: 0.875rem;
            margin: 0;
          }
          .sso-submit-danger {
            background: var(--sso-error);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px;
            font-weight: 600;
            cursor: pointer;
          }
          .sso-submit-danger:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        `}</style>
      </form>
    );
  }

  return (
    <div className="sso-form">
      {error && <p className="sso-error">{error}</p>}
      <button type="button" disabled={loading} className="sso-submit" onClick={startEnrollment}>
        {loading ? "Chargement..." : "Activer la MFA"}
      </button>
      <style jsx>{`
        .sso-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .sso-error {
          color: var(--sso-error);
          font-size: 0.875rem;
          margin: 0;
        }
        .sso-submit {
          background: var(--sso-accent);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .sso-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
