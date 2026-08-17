"use client";

import { useState } from "react";

type Policy = {
  role: string;
  mode: "REQUIRED" | "OPTIONAL" | "DISABLED";
  gracePeriodDays: number;
  version: number;
  source: "DEFAULT" | "DATABASE";
  graceEndsAt: string | null;
  requirementEnforced: boolean;
};

export default function MfaPolicyManager({ initialPolicies }: { initialPolicies: Policy[] }) {
  const [policies, setPolicies] = useState(initialPolicies);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save(policy: Policy) {
    const reason = (reasons[policy.role] ?? "").trim();
    if (reason.length < 3) {
      setMessage(`Un motif est obligatoire pour ${policy.role}.`);
      return;
    }

    setSavingRole(policy.role);
    setMessage(null);
    try {
      const response = await fetch("/api/mfa/policies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: policy.role,
          mode: policy.mode,
          gracePeriodDays: policy.gracePeriodDays,
          reason,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 428 && payload.error === "STEP_UP_REQUIRED") {
        window.location.href = "/account/mfa/step-up?redirect=%2Fsecurity-policies%2Fmfa";
        return;
      }
      if (!response.ok) throw new Error(payload.error || "Impossible d'enregistrer la policy");
      setPolicies((current) => current.map((item) => (item.role === policy.role ? payload.policy : item)));
      setReasons((current) => ({ ...current, [policy.role]: "" }));
      setMessage(`Policy ${policy.role} enregistrée en version ${payload.policy.version}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur d'enregistrement");
    } finally {
      setSavingRole(null);
    }
  }

  function patch(role: string, values: Partial<Policy>) {
    setPolicies((current) => current.map((item) => (item.role === role ? { ...item, ...values } : item)));
  }

  return (
    <div className="policy-manager">
      {message && <p className="policy-message">{message}</p>}
      <div className="policy-list">
        {policies.map((policy) => (
          <div className="policy-row" key={policy.role}>
            <div>
              <strong>{policy.role}</strong>
              <div className="policy-meta">Source : {policy.source} · version {policy.version}</div>
            </div>
            <select value={policy.mode} onChange={(event) => patch(policy.role, { mode: event.target.value as Policy["mode"] })}>
              <option value="REQUIRED">REQUIRED</option>
              <option value="OPTIONAL">OPTIONAL</option>
              <option value="DISABLED">DISABLED</option>
            </select>
            <label className="grace-field">
              Grâce (jours)
              <input
                type="number"
                min={0}
                max={90}
                value={policy.gracePeriodDays}
                onChange={(event) => patch(policy.role, { gracePeriodDays: Number(event.target.value) })}
              />
            </label>
            <label className="reason-field">
              Motif
              <input
                type="text"
                maxLength={1000}
                value={reasons[policy.role] ?? ""}
                onChange={(event) => setReasons((current) => ({ ...current, [policy.role]: event.target.value }))}
                placeholder="Pourquoi ce changement ?"
              />
            </label>
            <button type="button" disabled={savingRole === policy.role} onClick={() => save(policy)}>
              {savingRole === policy.role ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        ))}
      </div>
      <style jsx>{`
        .policy-manager { display: flex; flex-direction: column; gap: 16px; }
        .policy-list { display: flex; flex-direction: column; gap: 10px; }
        .policy-row { display: grid; grid-template-columns: minmax(170px, 1fr) 160px 130px minmax(220px, 1.2fr) 125px; gap: 12px; align-items: end; padding: 14px; border: 1px solid var(--sso-border); border-radius: 10px; }
        .policy-meta { color: var(--sso-muted); font-size: .75rem; margin-top: 4px; }
        select, input { width: 100%; background: var(--sso-bg); color: var(--sso-text); border: 1px solid var(--sso-border); border-radius: 8px; padding: 9px 10px; }
        .grace-field, .reason-field { color: var(--sso-muted); font-size: .75rem; display: flex; flex-direction: column; gap: 4px; }
        button { background: var(--sso-accent); color: white; border: 0; border-radius: 8px; padding: 10px 12px; font-weight: 600; cursor: pointer; }
        button:disabled { opacity: .6; cursor: not-allowed; }
        .policy-message { margin: 0; color: var(--sso-text); }
        @media (max-width: 900px) { .policy-row { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
