import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowLeft, FiCalendar, FiClock, FiExternalLink, FiMapPin, FiShield, FiUsers } from "react-icons/fi";
import { TeamBadge } from "@/components/TeamBadge";
import { formatDate, roleLabel } from "@/lib/assignmentView";
import { getLocale, localize } from "@/lib/i18n";
import { requireRequestSession } from "@/lib/requestSession";
import { AssignmentService } from "@/services/AssignmentService";
import { AssignmentWorkflowService } from "@/services/AssignmentWorkflowService";
import { canWriteMatchReport } from "@/lib/refereeRules";
import {
  acceptAssignmentAction,
  declineAssignmentAction,
  requestReplacementAction,
} from "../actions";

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, locale, routeParams] = await Promise.all([requireRequestSession(), getLocale(), params]);
  const assignmentId = Number.parseInt(routeParams.id, 10);
  if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) notFound();

  const service = new AssignmentService();
  const assignment = await service.getMine(session.id, assignmentId);
  if (!assignment?.match) notFound();
  const [team, workflow] = await Promise.all([
    service.listMatchTeam(assignment.matchId),
    assignment.status === "ACTIVE"
      ? new AssignmentWorkflowService().getState(session.id, assignmentId)
      : Promise.resolve(null),
  ]);
  const match = assignment.match;
  const home = localize(locale, match.homeTeam?.name, match.homeTeam?.nameAr);
  const away = localize(locale, match.awayTeam?.name, match.awayTeam?.nameAr);
  const stadium = localize(locale, match.homeTeam?.stadium, match.homeTeam?.stadiumAr);
  const season = match.matchday?.season;
  const league = localize(locale, season?.league?.nom ?? season?.nom, season?.league?.nom_ar);
  const matchOperationsUrl = `${(process.env.MATCH_OPERATIONS_URL || "http://localhost:3001").replace(/\/$/, "")}/${match.id}`;

  const responseLabel = workflow?.response.status === "ACCEPTED"
    ? (locale === "ar" ? "مقبول" : "Acceptée")
    : workflow?.response.status === "DECLINED"
      ? (locale === "ar" ? "مرفوض" : "Refusée")
      : workflow?.acceptanceOverdue
        ? (locale === "ar" ? "انتهت مهلة القبول" : "Délai d'acceptation dépassé")
        : (locale === "ar" ? "في انتظار الرد" : "En attente de réponse");

  return (
    <>
      <Link href="/assignments" className="back-link"><FiArrowLeft />{locale === "ar" ? "العودة إلى التعيينات" : "Retour aux désignations"}</Link>
      <div className="detail-hero">
        <div className="detail-status-row">
          <span className={`role-pill role-${assignment.role.toLowerCase()}`}>{roleLabel(assignment.role, locale)}</span>
          <span className={`status-dot ${assignment.status.toLowerCase()}`}>{assignment.status === "ACTIVE" ? (locale === "ar" ? "تعيين نشط" : "Désignation active") : (locale === "ar" ? "تعيين ملغى" : "Désignation révoquée")}</span>
          {workflow && <span className="status-dot">{responseLabel}</span>}
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

      {workflow && (
        <section className="panel-card" style={{ marginBottom: "1rem" }}>
          <div className="panel-title"><FiShield /><div><span>{locale === "ar" ? "سير التعيين" : "Workflow désignation"}</span><h2>{responseLabel}</h2></div></div>
          {workflow.response.status === "PENDING_ACCEPTANCE" && (
            <>
              <p>
                {locale === "ar" ? "آخر أجل للقبول: " : "Deadline d'acceptation : "}
                <strong>{workflow.response.responseDeadline.toLocaleString(locale === "ar" ? "ar-TN" : "fr-FR")}</strong>
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                {!workflow.acceptanceOverdue && (
                  <form action={acceptAssignmentAction.bind(null, assignment.id)}>
                    <button type="submit" className="primary-action">{locale === "ar" ? "قبول التعيين" : "Accepter la désignation"}</button>
                  </form>
                )}
                <form action={declineAssignmentAction.bind(null, assignment.id)} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input name="reason" minLength={5} maxLength={500} required placeholder={locale === "ar" ? "سبب الرفض" : "Motif du refus"} />
                  <button type="submit" className="secondary-action">{locale === "ar" ? "رفض" : "Refuser"}</button>
                </form>
              </div>
            </>
          )}

          {workflow.response.status === "DECLINED" && workflow.response.declineReason && (
            <p><strong>{locale === "ar" ? "سبب الرفض: " : "Motif du refus : "}</strong>{workflow.response.declineReason}</p>
          )}

          {workflow.response.status === "ACCEPTED" && !workflow.replacementRequest && (
            <form action={requestReplacementAction.bind(null, assignment.id)} style={{ display: "grid", gap: 8, maxWidth: 620 }}>
              <label>
                {locale === "ar" ? "طلب تعويض" : "Demander un remplacement"}
                <textarea name="reason" minLength={5} maxLength={500} required rows={3} placeholder={locale === "ar" ? "اشرح سبب طلب التعويض" : "Expliquez le motif de la demande"} />
              </label>
              <button type="submit" className="secondary-action">{locale === "ar" ? "إرسال الطلب" : "Envoyer la demande"}</button>
            </form>
          )}

          {workflow.replacementRequest && (
            <div className="revoked-notice">
              {locale === "ar" ? "طلب التعويض: " : "Demande de remplacement : "}
              <strong>{workflow.replacementRequest.status}</strong>
              {workflow.replacementRequest.reviewNote ? ` — ${workflow.replacementRequest.reviewNote}` : ""}
            </div>
          )}
        </section>
      )}

      <div className="detail-columns">
        <section className="panel-card">
          <div className="panel-title"><FiUsers /><div><span>{locale === "ar" ? "المباراة" : "Match"}</span><h2>{locale === "ar" ? "طاقم التحكيم" : "Équipe arbitrale"}</h2></div></div>
          <div className="official-list">
            {team.map((official, index) => {
              const assistantNumber = team
                .slice(0, index + 1)
                .filter((candidate) => candidate.role === "ASSISTANT_REFEREE").length;
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
          {assignment.status === "ACTIVE" && workflow?.response.status === "ACCEPTED" ? (
            <a href={matchOperationsUrl} className="primary-action">{locale === "ar" ? "فتح ورقة المباراة" : "Ouvrir la feuille de match"}<FiExternalLink /></a>
          ) : assignment.status === "ACTIVE" ? (
            <div className="revoked-notice">{locale === "ar" ? "يجب قبول التعيين قبل فتح ورقة المباراة." : "Vous devez accepter la désignation avant d'ouvrir la feuille de match."}</div>
          ) : (
            <div className="revoked-notice">{locale === "ar" ? "لم يعد هذا التعيين يمنح حق الدخول إلى المباراة." : "Cette désignation ne donne plus accès au match."}</div>
          )}
          {workflow?.response.status === "ACCEPTED" && canWriteMatchReport(assignment.role, assignment.status, match.status) && (
            <Link href={`/reports/${assignment.id}`} className="secondary-action report-shortcut">
              {locale === "ar" ? "كتابة التقرير التكميلي" : "Rédiger le rapport complémentaire"}
            </Link>
          )}
        </section>
      </div>
    </>
  );
}
