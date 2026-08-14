import { FiClock, FiRotateCcw } from "react-icons/fi";
import { AssignmentCard } from "@/components/AssignmentCard";
import { PageHeading } from "@/components/PageHeading";
import { formatDate } from "@/lib/assignmentView";
import { getLocale } from "@/lib/i18n";
import { requireRequestSession } from "@/lib/requestSession";
import { AssignmentService } from "@/services/AssignmentService";

export default async function AssignmentHistoryPage() {
  const [session, locale] = await Promise.all([requireRequestSession(), getLocale()]);
  const assignments = await new AssignmentService().history(session.id);
  return <>
    <PageHeading title={locale === "ar" ? "سجل التعيينات" : "Historique des désignations"} description={locale === "ar" ? "الأثر الكامل لتعييناتك وتواريخ الإلغاء." : "La trace complète de vos affectations et de leurs éventuelles révocations."} />
    <div className="history-list">
      {assignments.map((assignment) => <div className="history-entry" key={assignment.id}>
        <div className="history-meta"><span><FiClock />{locale === "ar" ? "تم التعيين" : "Désigné le"} {formatDate(assignment.assignedAt, locale, { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>{assignment.revokedAt && <span className="revoked"><FiRotateCcw />{locale === "ar" ? "ألغي في" : "Révoqué le"} {formatDate(assignment.revokedAt, locale, { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}</div>
        <AssignmentCard assignment={assignment} locale={locale} />
      </div>)}
    </div>
    {assignments.length === 0 && <div className="empty-state"><FiClock /><h3>{locale === "ar" ? "لا يوجد سجل" : "Aucun historique"}</h3></div>}
  </>;
}
