"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

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
      <div className="min-h-screen bg-gray-50 flex items-start justify-center py-10 px-4">
        <div className="w-full max-w-xl">
          <h1 className="text-xl font-semibold text-gray-900 text-center mb-6">
            TeamManager — Choisissez votre club
          </h1>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-5">
            {loadingTeams ? (
              <div className="flex justify-center py-8">
                <span className="spinner-border spinner-border-sm text-gray-400" role="status" aria-hidden="true" />
              </div>
            ) : teams.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucun club disponible.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setSelectedTeam(team)}
                    className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors py-4 px-2"
                  >
                    {team.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={team.logoUrl} alt={team.nom} className="w-10 h-10 object-contain" />
                    ) : (
                      <i className="fas fa-shield-alt text-2xl text-gray-400" aria-hidden="true" />
                    )}
                    <span className="text-sm text-center text-gray-700">{team.nom}</span>
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
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-lg font-semibold text-gray-900 text-center mb-6">{selectedTeam.nom}</h1>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              ) : (
                "Se connecter"
              )}
            </button>
            <button
              type="button"
              className="w-full text-sm text-blue-600 hover:underline"
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
  );
}
