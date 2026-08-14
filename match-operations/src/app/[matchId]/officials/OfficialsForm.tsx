"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

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

const ROLE_KEYS = { REFEREE_CENTRAL: "officials.roles.refereeCentral", ASSISTANT_1: "officials.roles.assistant1", ASSISTANT_2: "officials.roles.assistant2", FOURTH_OFFICIAL: "officials.roles.fourth", DELEGATE: "officials.roles.delegate" } as const;

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
  const { t } = useLanguage();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const findOfficial = (role: OfficialRole) => officials.find((o) => o.role === role) ?? null;
  const allMandatoryConfirmed = ROLE_ORDER.filter((r) => MANDATORY[r]).every((r) => findOfficial(r)?.confirmed);

  const refresh = () => startTransition(() => router.refresh());

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">{t("officials.title")}</h1>
          <p className="text-muted mb-0">
            {homeTeamName} <span className="text-muted">{t("match.versus")}</span> {awayTeamName}
          </p>
        </div>
        <Link href={`/${matchId}/pre-match`} className="btn btn-outline-secondary">
          <i className="bx bx-left-arrow-alt me-2" aria-hidden="true" />
          {t("controls.actions.backToSignatures")}
        </Link>
      </div>

      {allMandatoryConfirmed ? (
        <div className="alert alert-success mb-4">
          <i className="bx bx-check-circle me-2" aria-hidden="true" />
          {t("officials.validation.complete")}
        </div>
      ) : (
        <div className="alert alert-warning mb-4">
          <i className="bx bx-error me-2" aria-hidden="true" />
          {t("officials.validation.required")}
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
  const { t } = useLanguage();
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
        setError(result.error ? t(result.error, result.errorParams) : t("common.errors.save"));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!fullName.trim()) {
      setError(t("officials.validation.nameRequired"));
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
        setError(result.error ? t(result.error, result.errorParams) : t("common.errors.validation"));
      }
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="col-md-4">
      <div className={`card h-100 ${isConfirmed ? "border-success" : ""}`}>
        <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
          <h6 className="card-title mb-0">{t(ROLE_KEYS[role])}</h6>
          {MANDATORY[role] && <span className="badge bg-danger-subtle text-danger">{t("common.validation.required")}</span>}
        </div>
        <div className="card-body d-flex flex-column">
          <div className="mb-3">
            <label className="form-label">{t("officials.fields.fullName")}</label>
            <input
              type="text"
              className="form-control"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving || confirming}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">{t("officials.fields.license")}</label>
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
              {saving ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : t("common.actions.save")}
            </button>
            <button type="button" className="btn btn-primary btn-sm flex-grow-1" onClick={handleConfirm} disabled={saving || confirming}>
              {confirming ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              ) : isConfirmed ? (
                <>
                  <i className="bx bx-check me-1" aria-hidden="true" />
                  {t("officials.actions.revalidate")}
                </>
              ) : (
                t("common.actions.validate")
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
