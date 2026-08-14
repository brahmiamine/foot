import Link from "next/link";
import { FiCalendar, FiChevronRight, FiClock, FiMapPin } from "react-icons/fi";
import type { Assignment } from "@/entities/Assignment";
import { formatDate, roleLabel } from "@/lib/assignmentView";
import { localize, type Locale } from "@/lib/i18n";
import { TeamBadge } from "./TeamBadge";

export function AssignmentCard({ assignment, locale }: { assignment: Assignment; locale: Locale }) {
  const match = assignment.match;
  if (!match) return null;
  const home = localize(locale, match.homeTeam?.name, match.homeTeam?.nameAr);
  const away = localize(locale, match.awayTeam?.name, match.awayTeam?.nameAr);
  const competition = match.matchday?.season?.league
    ? localize(locale, match.matchday.season.league.nom, match.matchday.season.league.nom_ar)
    : match.matchday?.season?.nom ?? "—";
  const stadium = localize(locale, match.homeTeam?.stadium, match.homeTeam?.stadiumAr);

  return (
    <article className={`assignment-card ${assignment.status === "REVOKED" ? "is-revoked" : ""}`}>
      <div className="assignment-card-top">
        <span className={`role-pill role-${assignment.role.toLowerCase()}`}>{roleLabel(assignment.role, locale)}</span>
        <span className={`status-dot ${assignment.status.toLowerCase()}`}>
          {assignment.status === "ACTIVE" ? (locale === "ar" ? "نشط" : "Active") : (locale === "ar" ? "ملغى" : "Révoquée")}
        </span>
      </div>
      <div className="fixture-row">
        <div className="fixture-team"><TeamBadge name={home} logoUrl={match.homeTeam?.logoUrl} /><strong>{home}</strong></div>
        <span className="fixture-vs">VS</span>
        <div className="fixture-team"><TeamBadge name={away} logoUrl={match.awayTeam?.logoUrl} /><strong>{away}</strong></div>
      </div>
      <div className="assignment-meta">
        <span><FiCalendar />{competition}</span>
        <span><FiClock />{formatDate(match.date, locale)}</span>
        <span><FiMapPin />{stadium}</span>
      </div>
      <Link className="assignment-link" href={`/assignments/${assignment.id}`}>
        {locale === "ar" ? "عرض التفاصيل" : "Voir le détail"}<FiChevronRight />
      </Link>
    </article>
  );
}
