"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

interface MatchOption {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string | null;
  status: "UPCOMING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";
}

const STATUS_DOT: Record<MatchOption["status"], string> = {
  UPCOMING: "text-info",
  IN_PROGRESS: "text-success",
  FINISHED: "text-secondary",
  CANCELLED: "text-danger",
};

export function MatchesBottomBar({ matches }: { matches: MatchOption[] }) {
  const params = useParams<{ matchId?: string }>();
  const activeMatchId = params?.matchId;

  if (matches.length === 0) {
    return (
      <nav className="matchsheet-bottombar">
        <span className="text-muted small align-self-center px-2">Aucun match dans les prochains jours</span>
      </nav>
    );
  }

  return (
    <nav className="matchsheet-bottombar" aria-label="Liste des matchs">
      {matches.map((match) => (
        <Link
          key={match.id}
          href={`/${match.id}`}
          className={`match-chip ${activeMatchId === match.id ? "active" : ""}`}
        >
          <span className="match-chip-teams">
            <i className={`bx bxs-circle me-1 ${STATUS_DOT[match.status]}`} style={{ fontSize: "0.5rem" }} aria-hidden="true" />
            {match.homeTeam} vs {match.awayTeam}
          </span>
          <span className="match-chip-meta">
            {match.date
              ? new Date(match.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
              : "Date non définie"}
          </span>
        </Link>
      ))}
    </nav>
  );
}
