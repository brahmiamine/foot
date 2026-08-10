"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import "./login-skote.css";

interface TeamOption {
  id: string;
  nom: string;
  nomAr: string | null;
  logoUrl: string | null;
}

/**
 * Page de connexion teamManager : choix du club puis email/mot de passe.
 * Même compte que cardManager (table `User` partagée) — un club a un seul
 * accès pour la discipline (cardManager) et pour son site/effectif (teamManager).
 */
export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamOption | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetch("/api/teams")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: TeamOption[]) => setTeams(data))
      .catch(() => setTeams([]))
      .finally(() => setLoadingTeams(false));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        teamId: selectedTeam?.id ?? "",
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email, mot de passe ou club incorrect.");
      } else {
        router.push("/admin");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (!selectedTeam) {
    return (
      <div className="tm-login d-flex align-items-center py-4">
        <div className="container tm-login-shell">
          <div className="tm-login-card p-4 p-md-5">
            <div className="text-center mb-4">
              <h1 className="h4 tm-login-brand mb-2">TeamManager</h1>
              <p className="tm-login-muted mb-0">Choisissez votre club pour continuer</p>
            </div>

            {loadingTeams ? (
              <div className="d-flex justify-content-center py-5">
                <span className="spinner-border tm-login-muted" role="status" aria-hidden="true" />
              </div>
            ) : teams.length === 0 ? (
              <div className="alert alert-warning mb-0" role="alert">
                Aucun club disponible.
              </div>
            ) : (
              <div className="tm-team-grid">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setSelectedTeam(team)}
                    className="tm-team-card btn text-center d-flex flex-column align-items-center justify-content-center px-2 py-3"
                  >
                    {team.logoUrl ? (
                      <ImageWithFallback
                        src={team.logoUrl}
                        alt={team.nom}
                        className="tm-team-logo mb-2"
                        fallbackIcon="fas fa-shield-alt"
                      />
                    ) : (
                      <i className="fas fa-shield-alt fs-3 tm-login-muted mb-2" aria-hidden="true" />
                    )}
                    <span className="small fw-semibold text-dark text-wrap">{team.nom}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tm-login d-flex align-items-center py-4">
      <div className="container tm-login-shell">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-5">
            <div className="tm-login-card p-4 p-md-5">
              <div className="text-center mb-4">
                <h1 className="h5 tm-login-brand mb-2">Connexion administrateur</h1>
                <p className="tm-login-muted mb-0">Acces au panel du club selectionne</p>
              </div>

              <div className="tm-selected-team d-flex align-items-center gap-3 p-3 mb-4">
                {selectedTeam.logoUrl ? (
                  <ImageWithFallback
                    src={selectedTeam.logoUrl}
                    alt={selectedTeam.nom}
                    className="tm-team-logo"
                    fallbackIcon="fas fa-shield-alt"
                  />
                ) : (
                  <i className="fas fa-shield-alt fs-3 tm-login-muted" aria-hidden="true" />
                )}
                <div>
                  <div className="small tm-login-muted">Club selectionne</div>
                  <div className="fw-semibold text-dark">{selectedTeam.nom}</div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="tm-login-form">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="form-control"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="form-label">
                Mot de passe
              </label>
              <div className="input-group">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="form-control"
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-pressed={showPassword}
                >
                  <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn tm-login-action text-white w-100 mb-2"
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              ) : (
                "Se connecter"
              )}
            </button>

            <button
              type="button"
              className="btn btn-link w-100 text-decoration-none"
              onClick={() => {
                setSelectedTeam(null);
                setError(null);
              }}
            >
              Changer de club
            </button>
          </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
