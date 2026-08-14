import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowLeft, FiCalendar, FiClock, FiExternalLink, FiMapPin, FiShield, FiUsers } from "react-icons/fi";
import { TeamBadge } from "@/components/TeamBadge";
import { formatDate, roleLabel } from "@/lib/assignmentView";
import { getLocale, localize } from "@/lib/i18n";
import { requireRequestSession } from "@/lib/requestSession";
import { AssignmentService } from "@/services/AssignmentService";

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, locale, routeParams] = await Promise.all([requireRequestSession(), getLocale(), params]);
  const assignmentId = Number.parseInt(routeParams.id, 10);
  if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) notFound();

  const service = new AssignmentService();
  const assignment = await service.getMine(session.id, assignmentId);
  if (!assignment?.match) notFound();
  const team = await service.listMatchTeam(assignment.matchId);
  const match = assignment.match;
  const home = localize(locale, match.homeTeam?.name, match.homeTeam?.nameAr);
  const away = localize(locale, match.awayTeam?.name, match.awayTeam?.nameAr);
  const stadium = localize(locale, match.homeTeam?.stadium, match.homeTeam?.stadiumAr);
  const season = match.matchday?.season;
  const league = localize(locale, season?.league?.nom ?? season?.nom, season?.league?.nom_ar);
  const matchOperationsUrl = `${(process.env.MATCH_OPERATIONS_URL || "http://localhost:3001").replace(/\/$/, "")}/${match.id}`;
  let assistantNumber = 0;

  return (
    <>
      <Link href="/assignments" className="back-link"><FiArrowLeft />{locale === "ar" ? "العودة إلى التعيينات" : "Retour aux désignations"}</Link>
      <div className="detail-hero">
        <div className="detail-status-row">
          <span className={`role-pill role-${assignment.role.toLowerCase()}`}>{roleLabel(assignment.role, locale)}</span>
          <span className={`status-dot ${assignment.status.toLowerCase()}`}>{assignment.status === "ACTIVE" ? (locale === "ar" ? "تعيين نشط" : "Désignation active") : (locale === "ar" ? "تعيين ملغى" : "Désignation révoquée")}</span>
        </div>
        <div className="detail-fixture">
          <div><TeamBadge name={home} logoUrl={match.homeTeam?.logoUrl} /><h2>{home}</h2></div>
          <span>VS</span>
          <div><TeamBadge name={away} logoUrl={match.awayTeam?.logoUrl} /><h2>{away}</h2></div>
        </div>
        <div className="detail-meta-grid">
          <div><FiCalendar /><span>{locale === "ar" ? "المسابقة" : "Compétition"}</span><strong>{league}</strong></div>
          <div><FiClock /><span>{locale === "ar" ? "التاريخ والوقت" : "Date et heure"}</span><strong>{formatDate(match.date, locale)}</strong></div>
          <div><FiMapPin /><span>{locale === "ar" ? "الملعب" : "Stade"}</span><strong>{stadium}</strong></div>
          <div><FiShield /><span>{locale === "ar" ? "الجولة" : "Journée"}</span><strong>{locale === "ar" ? match.matchday?.nameAr || (match.matchday?.number ? `الجولة ${match.matchday.number}` : "—") : match.matchday?.nameFr || (match.matchday?.number ? `Journée ${match.matchday.number}` : "—")}</strong></div>
        </div>
      </div>

      <div className="detail-columns">
        <section className="panel-card">
          <div className="panel-title"><FiUsers /><div><span>{locale === "ar" ? "المباراة" : "Match"}</span><h2>{locale === "ar" ? "طاقم التحكيم" : "Équipe arbitrale"}</h2></div></div>
          <div className="official-list">
            {team.map((official) => {
              if (official.role === "ASSISTANT_REFEREE") assistantNumber += 1;
              const officialName = official.user?.name || official.referee?.nom || (locale === "ar" ? "حكم" : "Officiel");
              const label = official.role === "ASSISTANT_REFEREE"
                ? `${roleLabel(official.role, locale)} ${assistantNumber}`
                : roleLabel(official.role, locale);
              return (
                <div key={official.id} className={official.userId === session.id ? "is-me" : ""}>
                  <span className="official-avatar">{officialName.slice(0, 2).toUpperCase()}</span>
                  <div><strong>{officialName}{official.userId === session.id ? (locale === "ar" ? " (أنت)" : " (Vous)") : ""}</strong><span>{label}</span></div>
                  {official.status === "REVOKED" && <small>{locale === "ar" ? "ملغى" : "Révoqué"}</small>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel-card action-panel">
          <div className="panel-title"><FiShield /><div><span>Match Operations</span><h2>{locale === "ar" ? "ورقة المباراة" : "Feuille de match"}</h2></div></div>
          <p>{locale === "ar" ? "يتم التحقق من تعيينك مرة أخرى من طرف Match Operations قبل فتح بيانات المباراة." : "Votre affectation est de nouveau contrôlée par Match Operations avant l'ouverture des données du match."}</p>
          {assignment.status === "ACTIVE" ? (
            <a href={matchOperationsUrl} className="primary-action">{locale === "ar" ? "فتح ورقة المباراة" : "Ouvrir la feuille de match"}<FiExternalLink /></a>
          ) : (
            <div className="revoked-notice">{locale === "ar" ? "لم يعد هذا التعيين يمنح حق الدخول إلى المباراة." : "Cette désignation ne donne plus accès au match."}</div>
          )}
        </section>
      </div>
    </>
  );
}
