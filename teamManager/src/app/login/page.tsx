"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import "./login-skote.css";

/**
 * Page de connexion teamManager : simple email + mot de passe. `User.email`
 * porte une contrainte UNIQUE globale (table partagée avec cardManager) :
 * un email identifie un seul compte, donc un seul club — pas besoin de le
 * faire choisir, le club attaché au compte est récupéré automatiquement
 * côté serveur (voir `authorize()` dans `lib/auth.ts`).
 */
export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou mot de passe incorrect.");
      } else {
        router.push("/admin");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tm-login d-flex align-items-center py-4">
      <div className="container tm-login-shell">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-5">
            <div className="tm-login-card p-4 p-md-5">
              <div className="text-center mb-4">
                <h1 className="h4 tm-login-brand mb-2">TeamManager</h1>
                <p className="tm-login-muted mb-0">Connexion administrateur</p>
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
                  <input id="email" name="email" type="email" required autoComplete="email" className="form-control" />
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

                <button type="submit" disabled={loading} className="btn tm-login-action text-white w-100">
                  {loading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : "Se connecter"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
