"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createDisciplineOverrideAction,
  createDisciplineRuleSetAction,
  revokeDisciplineOverrideAction,
} from "./actions";

interface RuleRow {
  id: string;
  seasonId: string | null;
  competitionType: "championnat" | "coupe" | "tournois" | null;
  category: string | null;
  version: number;
  validFrom: string;
  validUntil: string | null;
  yellowWarningThreshold: number;
  yellowSuspensionThreshold: number;
  yellowSuspensionMatches: number;
  yellowFineAmount: number;
  redFineAmount: number;
  fineDueDays: number;
  defaultRedSuspensionMatches: number;
  defaultDoubleYellowSuspensionMatches: number;
  reason: string;
}

interface OverrideRow {
  id: string;
  targetType: "MATCH" | "PLAYER";
  targetId: string;
  values: Record<string, unknown>;
  validFrom: string;
  validUntil: string | null;
  reason: string;
  revokedAt: string | null;
  revocationReason: string | null;
}

interface SeasonScope {
  seasonId: string;
  seasonName: string;
  competitionType: "championnat" | "coupe" | "tournois";
  category: string;
}

function localNow(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatScope(rule: RuleRow, seasonScopes: SeasonScope[]): string {
  const season = seasonScopes.find((scope) => scope.seasonId === rule.seasonId)?.seasonName ?? rule.seasonId ?? "toutes saisons";
  return `${season} · ${rule.competitionType ?? "toutes compétitions"} · ${rule.category ?? "toutes catégories"}`;
}

export function DisciplineRulesManager({
  rules,
  overrides,
  seasonScopes,
  players,
  matches,
  allowedCategories,
  canManage,
  canGlobalScope,
}: {
  rules: RuleRow[];
  overrides: OverrideRow[];
  seasonScopes: SeasonScope[];
  players: Array<{ id: string; label: string; category: string }>;
  matches: Array<{ id: string; label: string; date: string | null }>;
  allowedCategories: readonly string[];
  canManage: boolean;
  canGlobalScope: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [targetType, setTargetType] = useState<"MATCH" | "PLAYER">(canGlobalScope ? "MATCH" : "PLAYER");

  const uniqueSeasons = useMemo(() => {
    const seen = new Map<string, SeasonScope>();
    for (const scope of seasonScopes) if (!seen.has(scope.seasonId)) seen.set(scope.seasonId, scope);
    return Array.from(seen.values());
  }, [seasonScopes]);

  function run(action: () => Promise<{ success: boolean; error?: string; message?: string }>, form?: HTMLFormElement) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      form?.reset();
      setNotice(result.message ?? "Enregistré");
      router.refresh();
    });
  }

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
        <div>
          <h1 className="h4 mb-1">Règles disciplinaires</h1>
          <p className="text-muted mb-0">Versions datées par saison, compétition et catégorie, avec overrides audités.</p>
        </div>
        <a href="/admin/suspensions" className="btn btn-outline-secondary btn-sm">Voir les suspensions</a>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      {canManage && (
        <section className="card mb-4">
          <div className="card-header bg-transparent"><strong>Créer une nouvelle version</strong></div>
          <div className="card-body">
            <form
              className="row g-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                run(() => createDisciplineRuleSetAction(new FormData(form)), form);
              }}
            >
              <div className="col-md-4">
                <label className="form-label">Saison</label>
                <select name="seasonId" className="form-select" defaultValue="">
                  <option value="">Toutes les saisons</option>
                  {uniqueSeasons.map((scope) => <option key={scope.seasonId} value={scope.seasonId}>{scope.seasonName}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Type de compétition</label>
                <select name="competitionType" className="form-select" defaultValue="">
                  <option value="">Tous</option>
                  <option value="championnat">Championnat</option>
                  <option value="coupe">Coupe</option>
                  <option value="tournois">Tournoi</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Catégorie</label>
                <select name="category" className="form-select" defaultValue={allowedCategories[0] ?? ""}>
                  {canGlobalScope && <option value="">Toutes les catégories</option>}
                  {allowedCategories.map((category) => <option key={category} value={category}>{category.toUpperCase()}</option>)}
                </select>
              </div>

              <div className="col-md-3"><label className="form-label">Alerte jaunes</label><input name="yellowWarningThreshold" type="number" className="form-control" min={0} max={20} defaultValue={2} required /></div>
              <div className="col-md-3"><label className="form-label">Seuil suspension jaunes</label><input name="yellowSuspensionThreshold" type="number" className="form-control" min={1} max={20} defaultValue={3} required /></div>
              <div className="col-md-3"><label className="form-label">Matchs de suspension</label><input name="yellowSuspensionMatches" type="number" className="form-control" min={1} max={20} defaultValue={1} required /></div>
              <div className="col-md-3"><label className="form-label">Échéance amende (jours)</label><input name="fineDueDays" type="number" className="form-control" min={1} max={365} defaultValue={15} required /></div>
              <div className="col-md-3"><label className="form-label">Amende jaune (TND)</label><input name="yellowFineAmount" type="number" step="0.001" className="form-control" min={0} defaultValue={30} required /></div>
              <div className="col-md-3"><label className="form-label">Amende rouge (TND)</label><input name="redFineAmount" type="number" step="0.001" className="form-control" min={0} defaultValue={50} required /></div>
              <div className="col-md-3"><label className="form-label">Rouge — défaut matchs</label><input name="defaultRedSuspensionMatches" type="number" className="form-control" min={1} max={20} defaultValue={1} required /></div>
              <div className="col-md-3"><label className="form-label">Double jaune — défaut matchs</label><input name="defaultDoubleYellowSuspensionMatches" type="number" className="form-control" min={1} max={20} defaultValue={1} required /></div>
              <div className="col-md-3"><label className="form-label">Valide à partir de</label><input name="validFrom" type="datetime-local" className="form-control" defaultValue={localNow()} required /></div>
              <div className="col-md-3"><label className="form-label">Valide jusqu’au</label><input name="validUntil" type="datetime-local" className="form-control" /></div>
              <div className="col-md-6"><label className="form-label">Motif / référence décision</label><input name="reason" className="form-control" minLength={3} maxLength={500} required placeholder="Ex. règlement saison 2026/2027, décision comité…" /></div>
              <div className="col-12"><button className="btn btn-primary" disabled={pending}>Créer la version</button></div>
            </form>
          </div>
        </section>
      )}

      <section className="card mb-4">
        <div className="card-header bg-transparent"><strong>Versions existantes</strong></div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead><tr><th>Scope</th><th>Version</th><th>Validité</th><th>Jaunes</th><th>Amendes</th><th>Motif</th></tr></thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{formatScope(rule, seasonScopes)}</td>
                  <td><span className="badge bg-primary-subtle text-primary">v{rule.version}</span></td>
                  <td className="small">{new Date(rule.validFrom).toLocaleString("fr-FR")}<br />→ {rule.validUntil ? new Date(rule.validUntil).toLocaleString("fr-FR") : "sans fin"}</td>
                  <td>{rule.yellowWarningThreshold} alerte / {rule.yellowSuspensionThreshold} seuil → {rule.yellowSuspensionMatches} match(s)</td>
                  <td>{rule.yellowFineAmount.toFixed(3)} / {rule.redFineAmount.toFixed(3)} TND · J+{rule.fineDueDays}</td>
                  <td className="small">{rule.reason}</td>
                </tr>
              ))}
              {rules.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-4">Aucune version : le comportement legacy reste actif.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {canManage && (
        <section className="card mb-4">
          <div className="card-header bg-transparent"><strong>Créer un override borné</strong></div>
          <div className="card-body">
            <form
              className="row g-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                run(() => createDisciplineOverrideAction(new FormData(form)), form);
              }}
            >
              <div className="col-md-3">
                <label className="form-label">Cible</label>
                <select name="targetType" className="form-select" value={targetType} onChange={(event) => setTargetType(event.target.value as "MATCH" | "PLAYER")}>
                  {canGlobalScope && <option value="MATCH">Match</option>}
                  <option value="PLAYER">Joueur</option>
                </select>
              </div>
              <div className="col-md-9">
                <label className="form-label">{targetType === "MATCH" ? "Match" : "Joueur"}</label>
                <select name="targetId" className="form-select" required defaultValue="">
                  <option value="" disabled>Sélectionner…</option>
                  {(targetType === "MATCH" ? matches : players).map((item) => (
                    <option key={item.id} value={item.id}>{item.label}{"date" in item && item.date ? ` · ${new Date(item.date).toLocaleDateString("fr-FR")}` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3"><label className="form-label">Nouveau seuil jaune</label><input name="yellowSuspensionThreshold" type="number" className="form-control" min={1} max={20} placeholder="inchangé" /></div>
              <div className="col-md-3"><label className="form-label">Nouvelle alerte jaune</label><input name="yellowWarningThreshold" type="number" className="form-control" min={0} max={20} placeholder="inchangé" /></div>
              <div className="col-md-3"><label className="form-label">Suspension jaune (matchs)</label><input name="yellowSuspensionMatches" type="number" className="form-control" min={1} max={20} placeholder="inchangé" /></div>
              <div className="col-md-3"><label className="form-label">Amende jaune</label><input name="yellowFineAmount" type="number" step="0.001" className="form-control" min={0} placeholder="inchangée" /></div>
              <div className="col-md-3"><label className="form-label">Amende rouge</label><input name="redFineAmount" type="number" step="0.001" className="form-control" min={0} placeholder="inchangée" /></div>
              <div className="col-md-3"><label className="form-label">Échéance (jours)</label><input name="fineDueDays" type="number" className="form-control" min={1} max={365} placeholder="inchangée" /></div>
              <div className="col-md-3"><label className="form-label">Début</label><input name="validFrom" type="datetime-local" className="form-control" defaultValue={localNow()} required /></div>
              <div className="col-md-3"><label className="form-label">Fin</label><input name="validUntil" type="datetime-local" className="form-control" /></div>
              <div className="col-12"><label className="form-label">Motif obligatoire</label><input name="reason" className="form-control" minLength={3} maxLength={500} required placeholder="Référence décision / justification exceptionnelle" /></div>
              <input name="defaultRedSuspensionMatches" type="hidden" value="" />
              <input name="defaultDoubleYellowSuspensionMatches" type="hidden" value="" />
              <div className="col-12"><button className="btn btn-warning" disabled={pending}>Créer l’override</button></div>
            </form>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-header bg-transparent"><strong>Overrides et révocations</strong></div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead><tr><th>Cible</th><th>Valeurs</th><th>Validité</th><th>Motif</th><th>État</th><th /></tr></thead>
            <tbody>
              {overrides.map((override) => {
                const targetLabel = override.targetType === "PLAYER"
                  ? players.find((player) => player.id === override.targetId)?.label ?? override.targetId
                  : matches.find((match) => match.id === override.targetId)?.label ?? override.targetId;
                return (
                  <tr key={override.id}>
                    <td>{override.targetType === "PLAYER" ? "Joueur" : "Match"}<br /><span className="small text-muted">{targetLabel}</span></td>
                    <td className="small"><code>{JSON.stringify(override.values)}</code></td>
                    <td className="small">{new Date(override.validFrom).toLocaleString("fr-FR")}<br />→ {override.validUntil ? new Date(override.validUntil).toLocaleString("fr-FR") : "sans fin"}</td>
                    <td className="small">{override.reason}</td>
                    <td>{override.revokedAt ? <span className="badge bg-secondary">Révoqué</span> : <span className="badge bg-warning text-dark">Actif</span>}</td>
                    <td>
                      {canManage && !override.revokedAt && (
                        <form onSubmit={(event) => {
                          event.preventDefault();
                          const form = event.currentTarget;
                          run(() => revokeDisciplineOverrideAction(override.id, new FormData(form)));
                        }} className="d-flex gap-2">
                          <input name="reason" className="form-control form-control-sm" minLength={3} required placeholder="Motif révocation" />
                          <button className="btn btn-outline-danger btn-sm" disabled={pending}>Révoquer</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
              {overrides.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-4">Aucun override.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
