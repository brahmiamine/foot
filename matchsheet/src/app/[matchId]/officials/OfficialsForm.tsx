"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OfficialRole } from "@/entities/MatchOfficial";
import { saveOfficial, confirmOfficial } from "./actions";

interface OfficialInfo {
  role: OfficialRole;
  fullName: string | null;
  licenseNumber: string | null;
  confirmed: boolean;
}

const ROLE_ORDER: OfficialRole[] = ["REFEREE_CENTRAL", "ASSISTANT_1", "ASSISTANT_2", "FOURTH_OFFICIAL", "DELEGATE"];

const ROLE_LABELS: Record<OfficialRole, string> = {
  REFEREE_CENTRAL: "Arbitre central",
  ASSISTANT_1: "Arbitre assistant 1",
  ASSISTANT_2: "Arbitre assistant 2",
  FOURTH_OFFICIAL: "4ᵉ arbitre",
  DELEGATE: "Délégué principal",
};

const MANDATORY: Record<OfficialRole, boolean> = {
  REFEREE_CENTRAL: true,
  ASSISTANT_1: true,
  ASSISTANT_2: true,
  FOURTH_OFFICIAL: false,
  DELEGATE: true,
};

export function OfficialsForm({
  matchId,
  sheetId,
  homeTeamName,
  awayTeamName,
  officials,
}: {
  matchId: string;
  sheetId: number;
  homeTeamName: string;
  awayTeamName: string;
  officials: OfficialInfo[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const findOfficial = (role: OfficialRole) => officials.find((o) => o.role === role) ?? null;
  const allMandatoryConfirmed = ROLE_ORDER.filter((r) => MANDATORY[r]).every((r) => findOfficial(r)?.confirmed);

  const refresh = () => startTransition(() => router.refresh());

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">Infos arbitre</h1>
          <p className="text-muted mb-0">
            {homeTeamName} <span className="text-muted">vs</span> {awayTeamName}
          </p>
        </div>
        <Link href={`/${matchId}/pre-match`} className="btn btn-outline-secondary">
          <i className="bx bx-left-arrow-alt me-2" aria-hidden="true" />
          Retour aux signatures
        </Link>
      </div>

      {allMandatoryConfirmed ? (
        <div className="alert alert-success mb-4">
          <i className="bx bx-check-circle me-2" aria-hidden="true" />
          Les postes obligatoires (arbitre central, assistants 1/2, délégué) sont validés.
        </div>
      ) : (
        <div className="alert alert-warning mb-4">
          <i className="bx bx-error me-2" aria-hidden="true" />
          Les postes obligatoires doivent être validés avant de confirmer l&apos;avant-match.
        </div>
      )}

      <div className="row g-3">
        {ROLE_ORDER.map((role) => (
          <OfficialCard key={role} role={role} matchId={matchId} sheetId={sheetId} initial={findOfficial(role)} onSaved={refresh} />
        ))}
      </div>
    </div>
  );
}

function OfficialCard({
  role,
  matchId,
  sheetId,
  initial,
  onSaved,
}: {
  role: OfficialRole;
  matchId: string;
  sheetId: number;
  initial: OfficialInfo | null;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [licenseNumber, setLicenseNumber] = useState(initial?.licenseNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = !!initial?.confirmed;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await saveOfficial(sheetId, matchId, role, fullName, licenseNumber);
      if (result.success) {
        onSaved();
      } else {
        setError(result.error || "Erreur lors de l'enregistrement.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!fullName.trim()) {
      setError("Le nom de l'officiel est requis.");
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      await saveOfficial(sheetId, matchId, role, fullName, licenseNumber);
      const result = await confirmOfficial(sheetId, matchId, role);
      if (result.success) {
        onSaved();
      } else {
        setError(result.error || "Erreur lors de la validation.");
      }
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="col-md-4">
      <div className={`card h-100 ${isConfirmed ? "border-success" : ""}`}>
        <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
          <h6 className="card-title mb-0">{ROLE_LABELS[role]}</h6>
          {MANDATORY[role] && <span className="badge bg-danger-subtle text-danger">Obligatoire</span>}
        </div>
        <div className="card-body d-flex flex-column">
          <div className="mb-3">
            <label className="form-label">Nom complet</label>
            <input
              type="text"
              className="form-control"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving || confirming}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">N° de licence</label>
            <input
              type="text"
              className="form-control"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              disabled={saving || confirming}
            />
          </div>
          {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
          <div className="d-flex gap-2 mt-auto">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleSave} disabled={saving || confirming}>
              {saving ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : "Enregistrer"}
            </button>
            <button type="button" className="btn btn-primary btn-sm flex-grow-1" onClick={handleConfirm} disabled={saving || confirming}>
              {confirming ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              ) : isConfirmed ? (
                <>
                  <i className="bx bx-check me-1" aria-hidden="true" />
                  Validé — revalider
                </>
              ) : (
                "Valider"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
