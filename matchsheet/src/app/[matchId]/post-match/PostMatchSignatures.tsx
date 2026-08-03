"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SignaturePad } from "@/components/SignaturePad";
import type { ActorRole, SignaturePhase } from "@/entities/Signature";
import type { SheetStatus } from "@/entities/Sheet";
import { saveSignature, addReservation, deleteReservation, confirmPostMatch } from "./actions";

interface SignatureInfo {
  id: number;
  actorRole: ActorRole;
  signerName: string | null;
  signatureData: string;
  signedAt: string;
}

interface ReservationInfo {
  id: number;
  authorRole: ActorRole;
  content: string;
  createdAt: string;
}

interface PostMatchSignaturesProps {
  matchId: string;
  sheetId: number;
  sheetStatus: SheetStatus;
  homeTeamName: string;
  awayTeamName: string;
  signatures: SignatureInfo[];
  reservations: ReservationInfo[];
  isPhaseComplete: boolean;
  closedAt: string | null;
}

const PHASE: SignaturePhase = "POST_MATCH";

const ROLE_LABELS: Record<ActorRole, string> = {
  TEAM_HOME: "Équipe domicile",
  TEAM_AWAY: "Équipe extérieure",
  REFEREE: "Arbitre",
};

const ROLE_BADGES: Record<ActorRole, string> = {
  TEAM_HOME: "bg-primary-subtle text-primary",
  TEAM_AWAY: "bg-info-subtle text-info",
  REFEREE: "bg-dark-subtle text-dark",
};

export function PostMatchSignatures({
  matchId,
  sheetId,
  sheetStatus,
  homeTeamName,
  awayTeamName,
  signatures,
  reservations,
  isPhaseComplete,
  closedAt,
}: PostMatchSignaturesProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [closing, setClosing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);

  const isClosed = sheetStatus === "CLOSED";

  const findSignature = (role: ActorRole) => signatures.find((s) => s.actorRole === role) ?? null;

  const refresh = () => startTransition(() => router.refresh());

  const handleSaved = (message: string) => {
    setPageError(null);
    setPageSuccess(message);
    refresh();
  };

  const handleClose = async () => {
    if (
      !window.confirm(
        "Clôturer la feuille de match ? Cette action est définitive : la feuille ne pourra plus être modifiée ensuite."
      )
    ) {
      return;
    }
    setClosing(true);
    setPageError(null);
    setPageSuccess(null);
    try {
      const result = await confirmPostMatch(sheetId, matchId);
      if (result.success) {
        router.push(`/${matchId}`);
      } else {
        setPageError(result.error || "Erreur lors de la clôture.");
      }
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">Signatures après-match</h1>
          <p className="text-muted mb-0">
            {homeTeamName} <span className="text-muted">vs</span> {awayTeamName}
          </p>
        </div>
      </div>

      {pageError && (
        <div className="alert alert-danger d-flex justify-content-between align-items-start mb-4">
          <span>{pageError}</span>
          <button type="button" onClick={() => setPageError(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}
      {pageSuccess && (
        <div className="alert alert-success d-flex justify-content-between align-items-start mb-4">
          <span>{pageSuccess}</span>
          <button type="button" onClick={() => setPageSuccess(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}

      {isClosed && (
        <div className="alert alert-success d-flex align-items-center gap-2 mb-4">
          <i className="bx bx-lock-alt fs-4" aria-hidden="true" />
          <span>
            Feuille clôturée{closedAt ? ` le ${new Date(closedAt).toLocaleString("fr-FR")}` : ""}. Cette feuille est en lecture
            seule.
          </span>
        </div>
      )}

      <div className="row g-3 mb-4">
        <SignatureSlot
          role="TEAM_HOME"
          label={`Équipe ${homeTeamName}`}
          sheetId={sheetId}
          initial={findSignature("TEAM_HOME")}
          onSaved={handleSaved}
          readOnly={isClosed}
        />
        <SignatureSlot
          role="TEAM_AWAY"
          label={`Équipe ${awayTeamName}`}
          sheetId={sheetId}
          initial={findSignature("TEAM_AWAY")}
          onSaved={handleSaved}
          readOnly={isClosed}
        />
        <SignatureSlot
          role="REFEREE"
          label="Arbitre"
          sheetId={sheetId}
          initial={findSignature("REFEREE")}
          onSaved={handleSaved}
          readOnly={isClosed}
        />
      </div>

      {!isClosed &&
        (isPhaseComplete ? (
          <div className="alert alert-success d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
            <div className="d-flex align-items-center gap-2">
              <i className="bx bx-check-circle fs-4" aria-hidden="true" />
              <span>Les 3 signatures après-match ont été recueillies.</span>
            </div>
            <button type="button" className="btn btn-dark" onClick={handleClose} disabled={closing}>
              {closing ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Clôture...
                </>
              ) : (
                <>
                  <i className="bx bx-flag me-2" aria-hidden="true" />
                  Clôturer la feuille de match
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="alert alert-warning mb-4">
            <i className="bx bx-error me-2" aria-hidden="true" />
            En attente des 3 signatures avant de pouvoir clôturer la feuille.
          </div>
        ))}

      <ReservationsSection
        sheetId={sheetId}
        matchId={matchId}
        title="Réserves après-match"
        reservations={reservations}
        onChanged={refresh}
        readOnly={isClosed}
      />
    </div>
  );
}

function SignatureSlot({
  role,
  label,
  sheetId,
  initial,
  onSaved,
  readOnly,
}: {
  role: ActorRole;
  label: string;
  sheetId: number;
  initial: SignatureInfo | null;
  onSaved: (message: string) => void;
  readOnly: boolean;
}) {
  const [editing, setEditing] = useState(!initial && !readOnly);
  const [signerName, setSignerName] = useState(initial?.signerName ?? "");
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [padKey, setPadKey] = useState(0);

  const handleSubmit = async () => {
    if (!pendingSignature) {
      setError("Veuillez signer dans le cadre avant de valider.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await saveSignature(sheetId, PHASE, role, signerName.trim() || null, pendingSignature);
      if (result.success) {
        setEditing(false);
        setPendingSignature(null);
        onSaved(result.message ?? "Signature enregistrée.");
      } else {
        setError(result.error || "Erreur lors de l'enregistrement.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReopen = () => {
    setEditing(true);
    setPendingSignature(null);
    setError(null);
    setPadKey((k) => k + 1);
  };

  const handleCancel = () => {
    setEditing(false);
    setPendingSignature(null);
    setError(null);
  };

  const isSigned = !editing && !!initial;

  return (
    <div className="col-md-4">
      <div className={`card h-100 ${isSigned ? "border-success" : ""}`}>
        <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
          <h6 className="card-title mb-0">{label}</h6>
          <span className={`badge ${ROLE_BADGES[role]}`}>{ROLE_LABELS[role]}</span>
        </div>
        <div className="card-body d-flex flex-column">
          {isSigned && initial ? (
            <>
              <div className="text-center mb-3">
                <i className="bx bx-check-circle text-success" style={{ fontSize: "2rem" }} aria-hidden="true" />
                <p className="mb-1 fw-medium">{initial.signerName || "Signé"}</p>
                <p className="text-muted small mb-0">Signé le {new Date(initial.signedAt).toLocaleString("fr-FR")}</p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={initial.signatureData}
                alt={`Signature — ${label}`}
                className="border rounded mb-3"
                style={{ maxHeight: "120px", width: "100%", objectFit: "contain", background: "#fff" }}
              />
              {!readOnly && (
                <button type="button" className="btn btn-outline-secondary btn-sm mt-auto" onClick={handleReopen}>
                  <i className="bx bx-edit-alt me-1" aria-hidden="true" />
                  Modifier
                </button>
              )}
            </>
          ) : readOnly ? (
            <p className="text-muted mb-0">Non signé.</p>
          ) : (
            <>
              <div className="mb-3">
                <label className="form-label">Nom du signataire (optionnel)</label>
                <input
                  type="text"
                  className="form-control"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="mb-3 flex-grow-1">
                <SignaturePad key={padKey} onChange={setPendingSignature} disabled={saving} />
              </div>
              {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
              <div className="d-flex gap-2 mt-auto">
                {initial && (
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleCancel} disabled={saving}>
                    Annuler
                  </button>
                )}
                <button type="button" className="btn btn-primary btn-sm flex-grow-1" onClick={handleSubmit} disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Enregistrement...
                    </>
                  ) : (
                    "Valider la signature"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ReservationsSection({
  sheetId,
  matchId,
  title,
  reservations,
  onChanged,
  readOnly,
}: {
  sheetId: number;
  matchId: string;
  title: string;
  reservations: ReservationInfo[];
  onChanged: () => void;
  readOnly: boolean;
}) {
  const [authorRole, setAuthorRole] = useState<ActorRole>("TEAM_HOME");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Le contenu de la réserve est requis.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await addReservation(sheetId, PHASE, authorRole, content);
      if (result.success) {
        setContent("");
        onChanged();
      } else {
        setError(result.error || "Erreur lors de l'ajout.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError(null);
    try {
      const result = await deleteReservation(id, matchId);
      if (result.success) {
        onChanged();
      } else {
        setError(result.error || "Erreur lors de la suppression.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="card">
      <div className="card-header bg-transparent">
        <h5 className="card-title mb-0">{title}</h5>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger d-flex justify-content-between align-items-start mb-3">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="btn-close" />
          </div>
        )}

        {reservations.length === 0 ? (
          <p className="text-muted mb-3">Aucune réserve enregistrée.</p>
        ) : (
          <ul className="list-group mb-3">
            {reservations.map((r) => (
              <li key={r.id} className="list-group-item">
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div>
                    <span className={`badge ${ROLE_BADGES[r.authorRole]} me-2`}>{ROLE_LABELS[r.authorRole]}</span>
                    <span className="text-muted small">{new Date(r.createdAt).toLocaleString("fr-FR")}</span>
                    <p className="mb-0 mt-1">{r.content}</p>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger flex-shrink-0"
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                    >
                      {deletingId === r.id ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      ) : (
                        <i className="bx bx-trash" aria-hidden="true" />
                      )}
                      <span className="visually-hidden">Supprimer</span>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {!readOnly && (
          <form className="row g-2 align-items-end" onSubmit={handleAdd}>
            <div className="col-md-3">
              <label className="form-label">Auteur</label>
              <select
                className="form-select"
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value as ActorRole)}
                disabled={submitting}
              >
                <option value="TEAM_HOME">Équipe domicile</option>
                <option value="TEAM_AWAY">Équipe extérieure</option>
                <option value="REFEREE">Arbitre</option>
              </select>
            </div>
            <div className="col-md-7">
              <label className="form-label">Contenu de la réserve</label>
              <textarea
                className="form-control"
                rows={2}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="col-md-2">
              <button type="submit" className="btn btn-outline-primary w-100" disabled={submitting}>
                {submitting ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                ) : (
                  <>
                    <i className="bx bx-plus me-1" aria-hidden="true" />
                    Ajouter
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
