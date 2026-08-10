"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { updateBranding } from "./actions";
import type { ResolvedBranding } from "@/lib/branding";

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  name: string;
}

function ColorField({ label, value, onChange, name }: ColorFieldProps) {
  return (
    <div className="col-md-4">
      <label className="form-label">{label}</label>
      <div className="input-group">
        <input type="color" className="form-control form-control-color" value={value} onChange={(e) => onChange(e.target.value)} title={label} />
        <input
          type="text"
          name={name}
          className="form-control"
          value={value}
          maxLength={7}
          pattern="^#[0-9a-fA-F]{6}$"
          onChange={(e) => onChange(e.target.value)}
          required
        />
      </div>
    </div>
  );
}

async function uploadAsset(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload/branding", { method: "POST", body: formData });
  const result = await res.json();
  if (!result.success) {
    throw new Error(result.error || "Erreur lors de l'envoi du fichier");
  }
  return result.path as string;
}

interface AssetFieldProps {
  label: string;
  hint: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
}

function AssetField({ label, hint, currentUrl, onUploaded }: AssetFieldProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      setPreview(URL.createObjectURL(file));
      const url = await uploadAsset(file);
      onUploaded(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setUploading(false);
    }
  };

  const displayed = preview ?? currentUrl;

  return (
    <div className="col-md-4">
      <label className="form-label">{label}</label>
      <div className="d-flex align-items-center gap-2 mb-2">
        <ImageWithFallback
          src={displayed ?? undefined}
          alt={label}
          fallbackIcon="fas fa-image"
          style={{ width: "48px", height: "48px", objectFit: "contain", borderRadius: "0.35rem" }}
          className="border bg-light"
        />
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : "Choisir un fichier"}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="d-none" onChange={handleChange} />
      <div className="form-text">{hint}</div>
      {error && <div className="text-danger small mt-1">{error}</div>}
    </div>
  );
}

export function BrandingForm({ branding }: { branding: ResolvedBranding }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(branding.displayName);
  const [shortName, setShortName] = useState(branding.shortName);
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl);
  const [logoDarkUrl, setLogoDarkUrl] = useState(branding.logoDarkUrl);
  const [faviconUrl, setFaviconUrl] = useState(branding.faviconUrl);
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(branding.secondaryColor);
  const [accentColor, setAccentColor] = useState(branding.accentColor);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      // Les champs texte des couleurs (contrôlés en state) sont déjà dans le
      // formulaire via `name=`, mais logo/favicon sont gérés par upload
      // séparé : on les injecte explicitement au lieu de dépendre d'un
      // <input> caché dupliquant le state.
      formData.set("logoUrl", logoUrl ?? "");
      formData.set("logoDarkUrl", logoDarkUrl ?? "");
      formData.set("faviconUrl", faviconUrl ?? "");

      const result = await updateBranding(formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        router.refresh();
      } else {
        setError(result.error || "Erreur");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <form onSubmit={handleSubmit} className="card">
          <div className="card-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            {success && (
              <div className="alert alert-success" role="alert">
                {success}
              </div>
            )}

            <h6 className="mb-3">Identité</h6>
            <div className="row g-3 mb-4">
              <div className="col-md-8">
                <label className="form-label">Nom affiché</label>
                <input type="text" name="displayName" className="form-control" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={150} required />
                <div className="form-text">Utilisé dans la sidebar, l&apos;en-tête et le titre des pages. Le nom officiel du référentiel n&apos;est pas modifié.</div>
              </div>
              <div className="col-md-4">
                <label className="form-label">Nom court</label>
                <input type="text" name="shortName" className="form-control" value={shortName} onChange={(e) => setShortName(e.target.value)} maxLength={30} required />
                <div className="form-text">Ex: &laquo;&nbsp;EST&nbsp;&raquo; — utilisé dans le titre d&apos;onglet.</div>
              </div>
            </div>

            <h6 className="mb-3">Logos & favicon</h6>
            <div className="row g-3 mb-4">
              <AssetField label="Logo (fond clair)" hint="Utilisé dans l'en-tête." currentUrl={logoUrl} onUploaded={setLogoUrl} />
              <AssetField label="Logo (fond sombre)" hint="Utilisé dans la sidebar. Si absent, le logo clair est réutilisé." currentUrl={logoDarkUrl} onUploaded={setLogoDarkUrl} />
              <AssetField label="Favicon" hint="Icône de l'onglet du navigateur." currentUrl={faviconUrl} onUploaded={setFaviconUrl} />
            </div>

            <h6 className="mb-3">Couleurs</h6>
            <div className="row g-3 mb-3">
              <ColorField label="Couleur primaire" name="primaryColor" value={primaryColor} onChange={setPrimaryColor} />
              <ColorField label="Couleur secondaire" name="secondaryColor" value={secondaryColor} onChange={setSecondaryColor} />
              <ColorField label="Couleur d'accent" name="accentColor" value={accentColor} onChange={setAccentColor} />
            </div>
            <p className="text-muted small mb-4">
              La couleur primaire habille l&apos;ensemble de l&apos;application (boutons, liens, élément actif du menu) ; le texte reste toujours lisible, ajusté automatiquement selon le contraste.
            </p>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
              Enregistrer
            </button>
          </div>
        </form>
      </div>

      <div className="col-lg-4">
        <div className="mb-2 fw-semibold text-muted small text-uppercase">Aperçu</div>
        <div className="rounded overflow-hidden border" style={{ background: "#f8f8fb" }}>
          <div className="d-flex align-items-center gap-2 px-3 py-2" style={{ background: "#2a3042" }}>
            <div
              className="d-flex align-items-center justify-content-center rounded flex-shrink-0"
              style={{ width: 32, height: 32, background: `${primaryColor}40`, overflow: "hidden" }}
            >
              {logoDarkUrl ? (
                <img src={logoDarkUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <span className="text-white fw-bold small">{shortName.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <span className="text-white fw-semibold text-truncate small">{displayName}</span>
          </div>
          <div className="px-3 py-2 border-bottom bg-white d-flex align-items-center gap-2">
            {logoUrl && <img src={logoUrl} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />}
            <span className="small text-muted">{displayName}</span>
          </div>
          <div className="p-3">
            <div
              className="rounded px-2 py-1 mb-2 small text-white d-flex align-items-center gap-2"
              style={{ background: `${primaryColor}59` }}
            >
              <i className="fas fa-home" aria-hidden="true" />
              Tableau de bord
            </div>
            <div className="card mb-2">
              <div className="card-body py-2 px-2 small">
                U17 <strong>3 - 1</strong>
              </div>
            </div>
            <button type="button" className="btn btn-sm w-100 text-white" style={{ background: primaryColor, border: "none" }} disabled>
              Enregistrer
            </button>
            <button type="button" className="btn btn-sm w-100 mt-2 text-white" style={{ background: accentColor, border: "none" }} disabled>
              Accent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
