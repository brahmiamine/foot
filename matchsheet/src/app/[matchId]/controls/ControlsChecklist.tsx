"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setPlayerControl } from "./actions";
import { useLocalizedName } from "@/lib/i18n/LanguageContext";

interface PlayerEntry {
  matchLineupId: number;
  name: string;
  nameAr: string | null;
  shirtNumber: number | null;
  role: "STARTER" | "SUBSTITUTE";
  isCaptain: boolean;
  checked: boolean;
  note: string;
}

export function ControlsChecklist({
  matchId,
  sheetId,
  homeTeamName,
  awayTeamName,
  homeEntries,
  awayEntries,
}: {
  matchId: string;
  sheetId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeEntries: PlayerEntry[];
  awayEntries: PlayerEntry[];
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());

  const total = homeEntries.length + awayEntries.length;
  const doneCount = [...homeEntries, ...awayEntries].filter((e) => e.checked).length;

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">{t("controls")}</h1>
          <p className="text-muted mb-0">
            {homeTeamName} <span className="text-muted">{t("vs")}</span> {awayTeamName} — {t("controlsHelp")}
          </p>
        </div>
        <div className="d-flex align-items-center gap-3">
          <span className="badge bg-info-subtle text-info">
            {t("controlled", { done: doneCount, total })}
          </span>
          <Link href={`/${matchId}/pre-match`} className="btn btn-outline-secondary">
            <i className="bx bx-left-arrow-alt me-2" aria-hidden="true" />
            {t("backSignatures")}
          </Link>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <TeamChecklist matchId={matchId} sheetId={sheetId} teamName={homeTeamName} entries={homeEntries} onChanged={refresh} />
        </div>
        <div className="col-12 col-lg-6">
          <TeamChecklist matchId={matchId} sheetId={sheetId} teamName={awayTeamName} entries={awayEntries} onChanged={refresh} />
        </div>
      </div>
    </div>
  );
}

function TeamChecklist({
  matchId,
  sheetId,
  teamName,
  entries,
  onChanged,
}: {
  matchId: string;
  sheetId: number;
  teamName: string;
  entries: PlayerEntry[];
  onChanged: () => void;
}) {
  const { t } = useLanguage();
  const starters = entries.filter((e) => e.role === "STARTER");
  const substitutes = entries.filter((e) => e.role === "SUBSTITUTE");

  return (
    <div className="card h-100">
      <div className="card-header bg-transparent">
        <h5 className="card-title mb-0">{teamName}</h5>
      </div>
      <div className="card-body">
        {entries.length === 0 ? (
          <p className="text-muted mb-0">{t("lineupMissingShort")}</p>
        ) : (
          <>
            <h6 className="text-uppercase small text-muted fw-semibold">{t("starters")}</h6>
            <ul className="list-group list-group-flush mb-3">
              {starters.map((entry) => (
                <PlayerRow key={entry.matchLineupId} matchId={matchId} sheetId={sheetId} entry={entry} onChanged={onChanged} />
              ))}
            </ul>
            {substitutes.length > 0 && (
              <>
                <h6 className="text-uppercase small text-muted fw-semibold">{t("substitutes")}</h6>
                <ul className="list-group list-group-flush">
                  {substitutes.map((entry) => (
                    <PlayerRow key={entry.matchLineupId} matchId={matchId} sheetId={sheetId} entry={entry} onChanged={onChanged} />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PlayerRow({
  matchId,
  sheetId,
  entry,
  onChanged,
}: {
  matchId: string;
  sheetId: number;
  entry: PlayerEntry;
  onChanged: () => void;
}) {
  const { t } = useLanguage();
  const [checked, setChecked] = useState(entry.checked);
  const [note, setNote] = useState(entry.note);
  const [saving, setSaving] = useState(false);
  const displayName = useLocalizedName(entry.name, entry.nameAr);

  const handleToggle = async () => {
    const next = !checked;
    setChecked(next);
    setSaving(true);
    try {
      await setPlayerControl(sheetId, matchId, entry.matchLineupId, next, note);
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const handleNoteBlur = async () => {
    if (note === entry.note) return;
    setSaving(true);
    try {
      await setPlayerControl(sheetId, matchId, entry.matchLineupId, checked, note);
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="list-group-item d-flex align-items-center gap-2 py-2">
      <div className="form-check flex-grow-1 mb-0">
        <input
          type="checkbox"
          className="form-check-input"
          id={`control-${entry.matchLineupId}`}
          checked={checked}
          onChange={handleToggle}
          disabled={saving}
        />
        <label className="form-check-label d-flex align-items-center gap-2" htmlFor={`control-${entry.matchLineupId}`}>
          <span className="badge bg-light text-dark border" style={{ minWidth: "2rem" }}>
            {entry.shirtNumber ?? "—"}
          </span>
          <span>{displayName}</span>
          {entry.isCaptain && <span className="badge bg-warning-subtle text-warning">C</span>}
        </label>
      </div>
      <input
        type="text"
        className="form-control form-control-sm"
        style={{ maxWidth: "180px" }}
        placeholder={t("optionalNote")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={handleNoteBlur}
        disabled={saving}
      />
    </li>
  );
}
