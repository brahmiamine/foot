import Link from "next/link";
import { FiCheckCircle, FiEdit3, FiFileText } from "react-icons/fi";
import { PageHeading } from "@/components/PageHeading";
import { formatDate, roleLabel } from "@/lib/assignmentView";
import { getLocale, localize } from "@/lib/i18n";
import { requireRequestSession } from "@/lib/requestSession";
import { ReportService } from "@/services/ReportService";

export default async function ReportsPage() {
  const [session, locale] = await Promise.all([requireRequestSession(), getLocale()]);
  const items = await new ReportService().listMine(session.id);
  return (
    <>
      <PageHeading
        title={locale === "ar" ? "تقارير الرسميين" : "Rapports des officiels"}
        description={
          locale === "ar"
            ? "حرّر وأرسل تقريرك بعد المباريات التي عُيّنت فيها كحكم أو مراقب مباراة أو مراقب حكام."
            : "Rédigez et envoyez votre rapport après les matchs où vous étiez désigné comme arbitre, commissaire ou observateur."
        }
      />
      <div className="report-list">
        {items.map(({ assignment, report, mandatory }) => {
          const match = assignment.match!;
          const home = localize(locale, match.homeTeam?.name, match.homeTeam?.nameAr);
          const away = localize(locale, match.awayTeam?.name, match.awayTeam?.nameAr);
          const locked = report?.status === "SUBMITTED" || report?.status === "AMENDED";
          const stateLabel = report?.status === "AMENDMENT_REQUESTED"
            ? (locale === "ar" ? "بانتظار التعديل" : "Amendement en cours")
            : report?.status === "AMENDED"
              ? (locale === "ar" ? "معدّل" : "Amendé")
              : report?.status === "SUBMITTED"
                ? (locale === "ar" ? "تم الإرسال" : "Envoyé")
                : report
                  ? (locale === "ar" ? "مسودة" : "Brouillon")
                  : (locale === "ar" ? "للتحرير" : "À rédiger");
          return <article className="report-row" key={assignment.id}>
            <span className={`report-state ${locked ? "submitted" : "draft"}`}>{locked ? <FiCheckCircle /> : <FiEdit3 />}{stateLabel}</span>
            <div>
              <strong>{home} — {away}</strong>
              <span>{formatDate(match.date, locale)} · {roleLabel(assignment.role, locale)}{mandatory && !report && (locale === "ar" ? " · إلزامي" : " · obligatoire")}</span>
              {report && <small>{report.subject}</small>}
            </div>
            <Link href={`/reports/${assignment.id}`}>{locked ? (locale === "ar" ? "عرض" : "Consulter") : (locale === "ar" ? "تحرير" : "Rédiger")}</Link>
          </article>;
        })}
      </div>
      {items.length === 0 && <div className="empty-state"><FiFileText /><h3>{locale === "ar" ? "لا يوجد تقرير متاح" : "Aucun rapport disponible"}</h3><p>{locale === "ar" ? "تظهر هنا فقط المباريات المنتهية التي كانت لديك فيها مهمة رسمية مؤهلة ونشطة." : "Seuls les matchs terminés pour lesquels vous avez une désignation officielle active et éligible apparaissent ici."}</p></div>}
    </>
  );
}
