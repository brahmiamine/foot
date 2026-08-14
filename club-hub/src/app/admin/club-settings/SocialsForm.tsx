"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveTeamSocials } from "./actions";

interface SocialsData {
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  xUrl: string;
}

const FIELDS: Array<{ name: keyof SocialsData; label: string; icon: string }> = [
  { name: "facebookUrl", label: "Facebook", icon: "fab fa-facebook" },
  { name: "instagramUrl", label: "Instagram", icon: "fab fa-instagram" },
  { name: "tiktokUrl", label: "TikTok", icon: "fab fa-tiktok" },
  { name: "youtubeUrl", label: "YouTube", icon: "fab fa-youtube" },
  { name: "xUrl", label: "X (Twitter)", icon: "fab fa-x-twitter" },
];

export function SocialsForm({ initialData }: { initialData: SocialsData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    try {
      const result = await saveTeamSocials(formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        router.refresh();
      } else {
        setError(result.error || "Erreur lors de l'enregistrement");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="d-flex gap-2 mb-3">
        <Link href="/admin/club-settings/contact" className="btn btn-outline-secondary btn-sm">
          Coordonnées
        </Link>
        <Link href="/admin/club-settings/messages" className="btn btn-outline-secondary btn-sm">
          Messages reçus
        </Link>
      </div>
      <form onSubmit={handleSubmit} className="card">
        <div className="card-body row g-3">
          {error && (
            <div className="col-12">
              <div className="alert alert-danger mb-0">{error}</div>
            </div>
          )}
          {success && (
            <div className="col-12">
              <div className="alert alert-success mb-0">{success}</div>
            </div>
          )}
          {FIELDS.map((field) => (
            <div className="col-12 col-md-6" key={field.name}>
              <label className="form-label">
                <i className={`${field.icon} me-2`} aria-hidden="true" />
                {field.label}
              </label>
              <input
                name={field.name}
                type="url"
                className="form-control"
                placeholder="https://..."
                defaultValue={initialData[field.name]}
              />
            </div>
          ))}
          <div className="col-12">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
