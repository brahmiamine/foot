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
      <PageHeading title={locale === "ar" ? "التقارير التكميلية" : "Rapports complémentaires"} description={locale === "ar" ? "حرّر وأرسل تقريرك بعد المباريات التي أدرتها." : "Rédigez et envoyez votre rapport après les matchs que vous avez arbitrés."} />
      <div className="report-list">
        {items.map(({ assignment, report }) => {
          const match = assignment.match!;
          const home = localize(locale, match.homeTeam?.name, match.homeTeam?.nameAr);
          const away = localize(locale, match.awayTeam?.name, match.awayTeam?.nameAr);
          return <article className="report-row" key={assignment.id}>
            <span className={`report-state ${report?.status === "SUBMITTED" ? "submitted" : "draft"}`}>{report?.status === "SUBMITTED" ? <FiCheckCircle /> : <FiEdit3 />}{report?.status === "SUBMITTED" ? (locale === "ar" ? "تم الإرسال" : "Envoyé") : report ? (locale === "ar" ? "مسودة" : "Brouillon") : (locale === "ar" ? "للتحرير" : "À rédiger")}</span>
            <div><strong>{home} — {away}</strong><span>{formatDate(match.date, locale)} · {roleLabel(assignment.role, locale)}</span>{report && <small>{report.subject}</small>}</div>
            <Link href={`/reports/${assignment.id}`}>{report?.status === "SUBMITTED" ? (locale === "ar" ? "عرض" : "Consulter") : (locale === "ar" ? "تحرير" : "Rédiger")}</Link>
          </article>;
        })}
      </div>
      {items.length === 0 && <div className="empty-state"><FiFileText /><h3>{locale === "ar" ? "لا يوجد تقرير متاح" : "Aucun rapport disponible"}</h3><p>{locale === "ar" ? "تظهر هنا فقط المباريات المنتهية التي كنت حكماً فيها." : "Seuls vos matchs terminés avec une désignation arbitrale active apparaissent ici."}</p></div>}
    </>
  );
}
