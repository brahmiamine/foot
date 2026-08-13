"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addCard,
  deleteCard,
  addGoal,
  deleteGoal,
  addInjury,
  deleteInjury,
  addSubstitution,
  deleteSubstitution,
  startMatch,
} from "./actions";

type CardType = "YELLOW" | "RED" | "DOUBLE_YELLOW";
type MatchPeriod = "H1" | "H2" | "ET1" | "ET2";
type SheetStatus = "DRAFT" | "PRE_MATCH_SIGNED" | "IN_PROGRESS" | "POST_MATCH_SIGNED" | "CLOSED";
type LineupRole = "STARTER" | "SUBSTITUTE";

interface TeamRef {
  id: string;
  name: string;
}

interface LineupPlayer {
  matchLineupId: number;
  playerId: string;
  name: string;
  shirtNumber: number | null;
  role: LineupRole;
  isCaptain: boolean;
  teamId: string;
}

interface CardReasonOption {
  id: string;
  labelFr: string;
  type: "YELLOW" | "RED" | "BOTH";
}

interface CardData {
  id: string;
  playerId: string;
  playerName: string;
  type: CardType;
  minute: number | null;
  period: MatchPeriod | null;
  cardReasonId: string | null;
  cardReasonLabel: string | null;
  commentFr: string | null;
}

interface GoalData {
  id: number;
  teamId: string;
  playerId: string | null;
  playerName: string | null;
  minute: number;
  period: MatchPeriod;
  isOwnGoal: boolean;
  isPenalty: boolean;
}

interface InjuryData {
  id: number;
  teamId: string;
  playerId: string | null;
  playerName: string | null;
  minute: number | null;
  period: MatchPeriod | null;
  description: string | null;
  requiresSubstitution: boolean;
}

interface SubstitutionData {
  id: number;
  teamId: string;
  playerOutId: string;
  playerOutName: string;
  playerInId: string;
  playerInName: string;
  minute: number;
  period: MatchPeriod;
}

interface LiveMatchSheetProps {
  matchId: string;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  sheetId: number;
  sheetStatus: SheetStatus;
  homeLineup: LineupPlayer[];
  awayLineup: LineupPlayer[];
  cardReasons: CardReasonOption[];
  cards: CardData[];
  goals: GoalData[];
  injuries: InjuryData[];
  substitutions: SubstitutionData[];
}

const PERIOD_KEYS = { H1: "events.periods.firstHalf", H2: "events.periods.secondHalf", ET1: "events.periods.extraTime1", ET2: "events.periods.extraTime2" } as const;

const PERIOD_SHORT: Record<MatchPeriod, string> = { H1: "H1", H2: "H2", ET1: "ET1", ET2: "ET2" };

const CARD_TYPE_KEYS = { YELLOW: "events.card.types.yellow", RED: "events.card.types.red", DOUBLE_YELLOW: "events.card.types.doubleYellow" } as const;
const CARD_TYPE_BADGES: Record<CardType, string> = {
  YELLOW: "bg-warning-subtle text-warning",
  RED: "bg-danger-subtle text-danger",
  DOUBLE_YELLOW: "bg-danger-subtle text-danger",
};

const SHEET_STATUS_KEYS = { DRAFT: "sheet.status.draft", PRE_MATCH_SIGNED: "sheet.status.preSigned", IN_PROGRESS: "sheet.status.inProgress", POST_MATCH_SIGNED: "sheet.status.postSigned", CLOSED: "sheet.status.closed" } as const;

type Tab = "cards" | "goals" | "injuries" | "substitutions";

export function LiveMatchSheet({
  matchId,
  homeTeam,
  awayTeam,
  sheetId,
  sheetStatus,
  homeLineup,
  awayLineup,
  cardReasons,
  cards,
  goals,
  injuries,
  substitutions,
}: LiveMatchSheetProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState<Tab>("cards");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [startingMatch, setStartingMatch] = useState(false);

  const teams = [homeTeam, awayTeam];
  const lineupByTeam: Record<string, LineupPlayer[]> = {
    [homeTeam.id]: homeLineup,
    [awayTeam.id]: awayLineup,
  };
  const teamName = (teamId: string) => teams.find((t) => t.id === teamId)?.name ?? "?";

  const refresh = () => startTransition(() => router.refresh());

  const handleStartMatch = async () => {
    setStartingMatch(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await startMatch(sheetId, matchId);
      if (result.success) {
        setSuccess(result.message ? t(result.message, result.messageParams) : t("events.live.started"));
        refresh();
      } else {
        setError(t(result.error, result.errorParams));
      }
    } finally {
      setStartingMatch(false);
    }
  };

  return (
    <div className="container-fluid px-0">
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div>
              <h2 className="h4 mb-1">
                {homeTeam.name} <span className="text-muted">{t("match.versus")}</span> {awayTeam.name}
              </h2>
              <p className="text-muted mb-0">{t("events.live.title")}</p>
            </div>
            <div className="d-flex flex-column align-items-end gap-2">
              <span className="badge bg-primary-subtle text-primary">{t(SHEET_STATUS_KEYS[sheetStatus])}</span>
              {(sheetStatus === "DRAFT" || sheetStatus === "PRE_MATCH_SIGNED") && (
                <button type="button" className="btn btn-success btn-sm" onClick={handleStartMatch} disabled={startingMatch}>
                  {startingMatch ? (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  ) : (
                    <>
                      <i className="bx bx-play me-1" aria-hidden="true" />
                      {t("events.live.actions.start")}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2 mt-3 small text-muted">
            <span className="fw-semibold">{t("events.fields.period")}</span>
            {(Object.keys(PERIOD_KEYS) as MatchPeriod[]).map((p) => (
              <span key={p} className="badge bg-light text-dark border">
                {PERIOD_SHORT[p]} = {t(PERIOD_KEYS[p])}
              </span>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-start mb-4">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label={t("common.actions.close")} className="btn-close" />
        </div>
      )}
      {success && (
        <div className="alert alert-success d-flex justify-content-between align-items-start mb-4">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess(null)} aria-label={t("common.actions.close")} className="btn-close" />
        </div>
      )}

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button type="button" className={`nav-link ${tab === "cards" ? "active" : ""}`} onClick={() => setTab("cards")}>
            {t("events.card.plural")} <span className="badge bg-secondary-subtle text-secondary ms-1">{cards.length}</span>
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${tab === "goals" ? "active" : ""}`} onClick={() => setTab("goals")}>
            {t("events.goal.plural")} <span className="badge bg-secondary-subtle text-secondary ms-1">{goals.length}</span>
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${tab === "injuries" ? "active" : ""}`} onClick={() => setTab("injuries")}>
            {t("events.injury.plural")} <span className="badge bg-secondary-subtle text-secondary ms-1">{injuries.length}</span>
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${tab === "substitutions" ? "active" : ""}`} onClick={() => setTab("substitutions")}>
            {t("events.substitution.plural")} <span className="badge bg-secondary-subtle text-secondary ms-1">{substitutions.length}</span>
          </button>
        </li>
      </ul>

      {tab === "cards" && (
        <CardsSection
          matchId={matchId}
          sheetId={sheetId}
          teams={teams}
          lineupByTeam={lineupByTeam}
          teamName={teamName}
          cardReasons={cardReasons}
          cards={cards}
          setError={setError}
          setSuccess={setSuccess}
          refresh={refresh}
        />
      )}
      {tab === "goals" && (
        <GoalsSection
          matchId={matchId}
          sheetId={sheetId}
          teams={teams}
          lineupByTeam={lineupByTeam}
          teamName={teamName}
          goals={goals}
          setError={setError}
          setSuccess={setSuccess}
          refresh={refresh}
        />
      )}
      {tab === "injuries" && (
        <InjuriesSection
          matchId={matchId}
          sheetId={sheetId}
          teams={teams}
          lineupByTeam={lineupByTeam}
          teamName={teamName}
          injuries={injuries}
          setError={setError}
          setSuccess={setSuccess}
          refresh={refresh}
        />
      )}
      {tab === "substitutions" && (
        <SubstitutionsSection
          matchId={matchId}
          sheetId={sheetId}
          teams={teams}
          lineupByTeam={lineupByTeam}
          teamName={teamName}
          substitutions={substitutions}
          setError={setError}
          setSuccess={setSuccess}
          refresh={refresh}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* {t("events.card.plural")}                                                                 */
/* ---------------------------------------------------------------------- */

function CardsSection({
  matchId,
  sheetId,
  teams,
  lineupByTeam,
  teamName,
  cardReasons,
  cards,
  setError,
  setSuccess,
  refresh,
}: {
  matchId: string;
  sheetId: number;
  teams: TeamRef[];
  lineupByTeam: Record<string, LineupPlayer[]>;
  teamName: (teamId: string) => string;
  cardReasons: CardReasonOption[];
  cards: CardData[];
  setError: (v: string | null) => void;
  setSuccess: (v: string | null) => void;
  refresh: () => void;
}) {
  const { t } = useLanguage();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [playerId, setPlayerId] = useState("");
  const [type, setType] = useState<CardType>("YELLOW");
  const [period, setPeriod] = useState<MatchPeriod>("H1");
  const [minute, setMinute] = useState("");
  const [cardReasonId, setCardReasonId] = useState("");
  const [comment, setComment] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const players = lineupByTeam[teamId] ?? [];
  const filteredReasons = cardReasons.filter((r) =>
    type === "YELLOW" ? r.type === "YELLOW" || r.type === "BOTH" : r.type === "RED" || r.type === "BOTH",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId) {
      setError(t("events.validation.selectPlayer"));
      return;
    }
    setAdding(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await addCard(sheetId, matchId, playerId, type, minute ? Number(minute) : null, period, cardReasonId || null, comment || null);
      if (result.success) {
        setSuccess(result.message ? t(result.message, result.messageParams) : t("events.card.messages.saved"));
        setPlayerId("");
        setMinute("");
        setCardReasonId("");
        setComment("");
        refresh();
      } else {
        setError(t(result.error, result.errorParams));
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("events.card.confirmDelete"))) return;
    setDeletingId(id);
    try {
      const result = await deleteCard(id, matchId);
      if (result.success) refresh();
      else setError(t(result.error, result.errorParams));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="card">
      <div className="card-header bg-transparent">
        <h5 className="card-title mb-0">{t("events.card.actions.add")}</h5>
      </div>
      <div className="card-body">
        <form className="row g-3 mb-4" onSubmit={handleSubmit}>
          <div className="col-md-3">
            <label className="form-label">{t("events.fields.team")}</label>
            <select
              className="form-select"
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                setPlayerId("");
              }}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">{t("events.fields.player")}</label>
            <select className="form-select" value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
              <option value="">{t("common.select.placeholder")}</option>
              {players.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {p.shirtNumber != null ? `#${p.shirtNumber} ` : ""}
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label d-block">{t("events.card.fields.type")}</label>
            <div className="btn-group w-100" role="group">
              <input
                type="radio"
                className="btn-check"
                name="cardType"
                id="card-type-yellow"
                autoComplete="off"
                checked={type === "YELLOW"}
                onChange={() => {
                  setType("YELLOW");
                  setCardReasonId("");
                }}
              />
              <label className="btn btn-outline-warning" htmlFor="card-type-yellow">
                Jaune
              </label>

              <input
                type="radio"
                className="btn-check"
                name="cardType"
                id="card-type-double"
                autoComplete="off"
                checked={type === "DOUBLE_YELLOW"}
                onChange={() => {
                  setType("DOUBLE_YELLOW");
                  setCardReasonId("");
                }}
              />
              <label className="btn btn-outline-danger" htmlFor="card-type-double">
                2e Jaune
              </label>

              <input
                type="radio"
                className="btn-check"
                name="cardType"
                id="card-type-red"
                autoComplete="off"
                checked={type === "RED"}
                onChange={() => {
                  setType("RED");
                  setCardReasonId("");
                }}
              />
              <label className="btn btn-outline-danger" htmlFor="card-type-red">
                Rouge
              </label>
            </div>
          </div>
          <div className="col-md-3">
            <label className="form-label">{t("events.fields.period")}</label>
            <select className="form-select" value={period} onChange={(e) => setPeriod(e.target.value as MatchPeriod)}>
              {(Object.keys(PERIOD_KEYS) as MatchPeriod[]).map((p) => (
                <option key={p} value={p}>
                  {t(PERIOD_KEYS[p])}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label">{t("events.fields.minute")}</label>
            <input type="number" min={0} max={130} className="form-control" value={minute} onChange={(e) => setMinute(e.target.value)} />
          </div>
          <div className="col-md-5">
            <label className="form-label">{t("events.card.fields.reason")}</label>
            <select className="form-select" value={cardReasonId} onChange={(e) => setCardReasonId(e.target.value)}>
              <option value="">{t("events.labels.noneSpecified")}</option>
              {filteredReasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.labelFr}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-5">
            <label className="form-label">{t("events.fields.commentOptional")}</label>
            <input type="text" className="form-control" value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          <div className="col-12">
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : t("events.card.actions.submit")}
            </button>
          </div>
        </form>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>{t("events.fields.team")}</th>
                <th>{t("events.fields.player")}</th>
                <th>{t("events.card.plural")}</th>
                <th>{t("events.fields.period")}</th>
                <th>{t("events.card.fields.reason")}</th>
                <th>{t("common.labels.comment")}</th>
                <th className="text-end">{t("common.labels.action")}</th>
              </tr>
            </thead>
            <tbody>
              {cards.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    Aucun carton enregistré
                  </td>
                </tr>
              ) : (
                cards.map((c) => {
                  const player = teams.flatMap((t) => lineupByTeam[t.id] ?? []).find((p) => p.playerId === c.playerId);
                  return (
                    <tr key={c.id}>
                      <td>{player ? teamName(player.teamId) : "—"}</td>
                      <td>{c.playerName}</td>
                      <td>
                        <span className={`badge ${CARD_TYPE_BADGES[c.type]}`}>{t(CARD_TYPE_KEYS[c.type])}</span>
                      </td>
                      <td>
                        {c.minute != null ? `${c.minute}'` : "—"} {c.period ? PERIOD_SHORT[c.period] : ""}
                      </td>
                      <td>{c.cardReasonLabel ?? "—"}</td>
                      <td>{c.commentFr ?? "—"}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                        >
                          {deletingId === c.id ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : t("common.actions.delete")}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* {t("events.goal.plural")}                                                                    */
/* ---------------------------------------------------------------------- */

function GoalsSection({
  matchId,
  sheetId,
  teams,
  lineupByTeam,
  teamName,
  goals,
  setError,
  setSuccess,
  refresh,
}: {
  matchId: string;
  sheetId: number;
  teams: TeamRef[];
  lineupByTeam: Record<string, LineupPlayer[]>;
  teamName: (teamId: string) => string;
  goals: GoalData[];
  setError: (v: string | null) => void;
  setSuccess: (v: string | null) => void;
  refresh: () => void;
}) {
  const { t } = useLanguage();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [playerId, setPlayerId] = useState("");
  const [period, setPeriod] = useState<MatchPeriod>("H1");
  const [minute, setMinute] = useState("");
  const [isOwnGoal, setIsOwnGoal] = useState(false);
  const [isPenalty, setIsPenalty] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const players = lineupByTeam[teamId] ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) {
      setError(t("events.validation.selectTeam"));
      return;
    }
    if (!minute) {
      setError(t("events.validation.minuteRequired"));
      return;
    }
    setAdding(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await addGoal(
        sheetId,
        matchId,
        teamId,
        playerId || null,
        Number(minute),
        period,
        isOwnGoal,
        isPenalty,
        crypto.randomUUID(),
      );
      if (result.success) {
        setSuccess(result.message ? t(result.message, result.messageParams) : t("events.goal.messages.saved"));
        setPlayerId("");
        setMinute("");
        setIsOwnGoal(false);
        setIsPenalty(false);
        refresh();
      } else {
        setError(t(result.error, result.errorParams));
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("events.goal.confirmDelete"))) return;
    setDeletingId(id);
    try {
      const result = await deleteGoal(id, matchId);
      if (result.success) refresh();
      else setError(t(result.error, result.errorParams));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="card">
      <div className="card-header bg-transparent">
        <h5 className="card-title mb-0">{t("events.goal.actions.add")}</h5>
      </div>
      <div className="card-body">
        <form className="row g-3 mb-4" onSubmit={handleSubmit}>
          <div className="col-md-3">
            <label className="form-label">{t("events.fields.team")}</label>
            <select
              className="form-select"
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                setPlayerId("");
              }}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">{t("events.fields.playerOptional")}</label>
            <select className="form-select" value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
              <option value="">{t("events.player.unidentified")}</option>
              {players.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {p.shirtNumber != null ? `#${p.shirtNumber} ` : ""}
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">{t("events.fields.period")}</label>
            <select className="form-select" value={period} onChange={(e) => setPeriod(e.target.value as MatchPeriod)}>
              {(Object.keys(PERIOD_KEYS) as MatchPeriod[]).map((p) => (
                <option key={p} value={p}>
                  {t(PERIOD_KEYS[p])}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">{t("events.fields.minute")}</label>
            <input type="number" min={0} max={130} className="form-control" value={minute} onChange={(e) => setMinute(e.target.value)} />
          </div>
          <div className="col-md-6">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="goal-own-goal"
                checked={isOwnGoal}
                onChange={(e) => setIsOwnGoal(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="goal-own-goal">
                Contre son camp
              </label>
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="goal-penalty"
                checked={isPenalty}
                onChange={(e) => setIsPenalty(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="goal-penalty">
                Sur penalty
              </label>
            </div>
          </div>
          <div className="col-12">
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : t("events.goal.actions.submit")}
            </button>
          </div>
        </form>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>{t("events.fields.team")}</th>
                <th>{t("events.goal.fields.scorer")}</th>
                <th>{t("events.fields.period")}</th>
                <th>{t("events.goal.fields.details")}</th>
                <th className="text-end">{t("common.labels.action")}</th>
              </tr>
            </thead>
            <tbody>
              {goals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    Aucun but enregistré
                  </td>
                </tr>
              ) : (
                goals.map((g) => (
                  <tr key={g.id}>
                    <td>{teamName(g.teamId)}</td>
                    <td>{g.playerName ?? t("events.player.unidentified")}</td>
                    <td>
                      {g.minute}&apos; {PERIOD_SHORT[g.period]}
                    </td>
                    <td>
                      {g.isOwnGoal && <span className="badge bg-danger-subtle text-danger me-1">{t("events.goal.fields.ownGoal")}</span>}
                      {g.isPenalty && <span className="badge bg-info-subtle text-info">{t("events.goal.fields.penalty")}</span>}
                      {!g.isOwnGoal && !g.isPenalty && "—"}
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(g.id)}
                        disabled={deletingId === g.id}
                      >
                        {deletingId === g.id ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : t("common.actions.delete")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* {t("events.injury.plural")}                                                               */
/* ---------------------------------------------------------------------- */

function InjuriesSection({
  matchId,
  sheetId,
  teams,
  lineupByTeam,
  teamName,
  injuries,
  setError,
  setSuccess,
  refresh,
}: {
  matchId: string;
  sheetId: number;
  teams: TeamRef[];
  lineupByTeam: Record<string, LineupPlayer[]>;
  teamName: (teamId: string) => string;
  injuries: InjuryData[];
  setError: (v: string | null) => void;
  setSuccess: (v: string | null) => void;
  refresh: () => void;
}) {
  const { t } = useLanguage();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [playerId, setPlayerId] = useState("");
  const [period, setPeriod] = useState<MatchPeriod | "">("");
  const [minute, setMinute] = useState("");
  const [description, setDescription] = useState("");
  const [requiresSubstitution, setRequiresSubstitution] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const players = lineupByTeam[teamId] ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) {
      setError(t("events.validation.selectTeam"));
      return;
    }
    if (!playerId) {
      setError(t("events.validation.selectPlayer"));
      return;
    }
    setAdding(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await addInjury(
        sheetId,
        matchId,
        teamId,
        playerId,
        minute ? Number(minute) : null,
        period === "" ? null : period,
        description || null,
        requiresSubstitution,
        crypto.randomUUID(),
      );
      if (result.success) {
        setSuccess(result.message ? t(result.message, result.messageParams) : t("events.injury.messages.saved"));
        setPlayerId("");
        setMinute("");
        setPeriod("");
        setDescription("");
        setRequiresSubstitution(false);
        refresh();
      } else {
        setError(t(result.error, result.errorParams));
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("events.injury.confirmDelete"))) return;
    setDeletingId(id);
    try {
      const result = await deleteInjury(id, matchId);
      if (result.success) refresh();
      else setError(t(result.error, result.errorParams));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="card">
      <div className="card-header bg-transparent">
        <h5 className="card-title mb-0">{t("events.injury.actions.add")}</h5>
      </div>
      <div className="card-body">
        <form className="row g-3 mb-4" onSubmit={handleSubmit}>
          <div className="col-md-3">
            <label className="form-label">{t("events.fields.team")}</label>
            <select
              className="form-select"
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                setPlayerId("");
              }}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">{t("events.fields.player")}</label>
            <select className="form-select" value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
              <option value="">{t("common.select.placeholder")}</option>
              {players.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {p.shirtNumber != null ? `#${p.shirtNumber} ` : ""}
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">{t("events.fields.periodOptional")}</label>
            <select className="form-select" value={period} onChange={(e) => setPeriod(e.target.value as MatchPeriod | "")}>
              <option value="">{t("common.labels.unspecified")}</option>
              {(Object.keys(PERIOD_KEYS) as MatchPeriod[]).map((p) => (
                <option key={p} value={p}>
                  {t(PERIOD_KEYS[p])}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">{t("events.fields.minuteOptional")}</label>
            <input type="number" min={0} max={130} className="form-control" value={minute} onChange={(e) => setMinute(e.target.value)} />
          </div>
          <div className="col-12">
            <label className="form-label">{t("common.labels.description")}</label>
            <textarea className="form-control" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="col-12">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="injury-requires-sub"
                checked={requiresSubstitution}
                onChange={(e) => setRequiresSubstitution(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="injury-requires-sub">
                Nécessite un remplacement
              </label>
            </div>
          </div>
          <div className="col-12">
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : t("events.injury.actions.submit")}
            </button>
          </div>
        </form>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>{t("events.fields.team")}</th>
                <th>{t("events.fields.player")}</th>
                <th>{t("events.fields.period")}</th>
                <th>{t("common.labels.description")}</th>
                <th>{t("events.injury.fields.replacement")}</th>
                <th className="text-end">{t("common.labels.action")}</th>
              </tr>
            </thead>
            <tbody>
              {injuries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    Aucune blessure enregistrée
                  </td>
                </tr>
              ) : (
                injuries.map((i) => (
                  <tr key={i.id}>
                    <td>{teamName(i.teamId)}</td>
                    <td>{i.playerName ?? t("events.player.unidentified")}</td>
                    <td>
                      {i.minute != null ? `${i.minute}'` : "—"} {i.period ? PERIOD_SHORT[i.period] : ""}
                    </td>
                    <td>{i.description ?? "—"}</td>
                    <td>
                      {i.requiresSubstitution ? (
                        <span className="badge bg-warning-subtle text-warning">{t("common.answers.yes")}</span>
                      ) : (
                        <span className="badge bg-light text-dark border">{t("common.answers.no")}</span>
                      )}
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(i.id)}
                        disabled={deletingId === i.id}
                      >
                        {deletingId === i.id ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : t("common.actions.delete")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* {t("events.substitution.plural")}                                                           */
/* ---------------------------------------------------------------------- */

function SubstitutionsSection({
  matchId,
  sheetId,
  teams,
  lineupByTeam,
  teamName,
  substitutions,
  setError,
  setSuccess,
  refresh,
}: {
  matchId: string;
  sheetId: number;
  teams: TeamRef[];
  lineupByTeam: Record<string, LineupPlayer[]>;
  teamName: (teamId: string) => string;
  substitutions: SubstitutionData[];
  setError: (v: string | null) => void;
  setSuccess: (v: string | null) => void;
  refresh: () => void;
}) {
  const { t } = useLanguage();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [playerOutId, setPlayerOutId] = useState("");
  const [playerInId, setPlayerInId] = useState("");
  const [period, setPeriod] = useState<MatchPeriod>("H1");
  const [minute, setMinute] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const players = lineupByTeam[teamId] ?? [];
  const alreadyOutIds = new Set(substitutions.filter((s) => s.teamId === teamId).map((s) => s.playerOutId));
  const alreadyInIds = new Set(substitutions.filter((s) => s.teamId === teamId).map((s) => s.playerInId));
  const outCandidates = players.filter((p) => p.role === "STARTER" && !alreadyOutIds.has(p.playerId));
  const inCandidates = players.filter((p) => p.role === "SUBSTITUTE" && !alreadyInIds.has(p.playerId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) {
      setError(t("events.validation.selectTeam"));
      return;
    }
    if (!playerOutId || !playerInId) {
      setError(t("events.validation.selectBothPlayers"));
      return;
    }
    if (!minute) {
      setError(t("events.validation.minuteRequired"));
      return;
    }
    setAdding(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await addSubstitution(
        sheetId,
        matchId,
        teamId,
        playerOutId,
        playerInId,
        Number(minute),
        period,
        crypto.randomUUID(),
      );
      if (result.success) {
        setSuccess(result.message ? t(result.message, result.messageParams) : t("events.substitution.messages.saved"));
        setPlayerOutId("");
        setPlayerInId("");
        setMinute("");
        refresh();
      } else {
        setError(t(result.error, result.errorParams));
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("events.substitution.confirmDelete"))) return;
    setDeletingId(id);
    try {
      const result = await deleteSubstitution(id, matchId);
      if (result.success) refresh();
      else setError(t(result.error, result.errorParams));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="card">
      <div className="card-header bg-transparent">
        <h5 className="card-title mb-0">{t("events.substitution.actions.add")}</h5>
      </div>
      <div className="card-body">
        <form className="row g-3 mb-4" onSubmit={handleSubmit}>
          <div className="col-md-3">
            <label className="form-label">{t("events.fields.team")}</label>
            <select
              className="form-select"
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                setPlayerOutId("");
                setPlayerInId("");
              }}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">{t("events.substitution.fields.playerOut")}</label>
            <select className="form-select" value={playerOutId} onChange={(e) => setPlayerOutId(e.target.value)}>
              <option value="">{t("common.select.placeholder")}</option>
              {outCandidates.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {p.shirtNumber != null ? `#${p.shirtNumber} ` : ""}
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">{t("events.substitution.fields.playerIn")}</label>
            <select className="form-select" value={playerInId} onChange={(e) => setPlayerInId(e.target.value)}>
              <option value="">{t("common.select.placeholder")}</option>
              {inCandidates.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {p.shirtNumber != null ? `#${p.shirtNumber} ` : ""}
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">{t("events.fields.period")}</label>
            <select className="form-select" value={period} onChange={(e) => setPeriod(e.target.value as MatchPeriod)}>
              {(Object.keys(PERIOD_KEYS) as MatchPeriod[]).map((p) => (
                <option key={p} value={p}>
                  {t(PERIOD_KEYS[p])}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">{t("events.fields.minute")}</label>
            <input type="number" min={0} max={130} className="form-control" value={minute} onChange={(e) => setMinute(e.target.value)} />
          </div>
          <div className="col-12">
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : t("events.substitution.actions.submit")}
            </button>
          </div>
        </form>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>{t("events.fields.team")}</th>
                <th>{t("events.substitution.change")}</th>
                <th>{t("events.fields.period")}</th>
                <th className="text-end">{t("common.labels.action")}</th>
              </tr>
            </thead>
            <tbody>
              {substitutions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    Aucun remplacement enregistré
                  </td>
                </tr>
              ) : (
                substitutions.map((s) => (
                  <tr key={s.id}>
                    <td>{teamName(s.teamId)}</td>
                    <td>
                      <span className="text-danger">{s.playerOutName}</span> {t("events.substitution.exits")}, <span className="text-success">{s.playerInName}</span> {t("events.substitution.enters")}
                    </td>
                    <td>
                      {s.minute}&apos; {PERIOD_SHORT[s.period]}
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                      >
                        {deletingId === s.id ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : t("common.actions.delete")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
