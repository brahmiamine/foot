import Link from "next/link";
import { FiCalendar } from "react-icons/fi";
import { AssignmentCard } from "@/components/AssignmentCard";
import { PageHeading } from "@/components/PageHeading";
import { resolveAssignmentFilter } from "@/lib/assignmentView";
import { getLocale } from "@/lib/i18n";
import { requireRequestSession } from "@/lib/requestSession";
import { AssignmentService } from "@/services/AssignmentService";

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const [session, locale, query] = await Promise.all([requireRequestSession(), getLocale(), searchParams]);
  const view = resolveAssignmentFilter(query.view);
  const assignments = await new AssignmentService().listMine(session.id, view);
  const tabs = [
    { key: "upcoming", fr: "À venir", ar: "القادمة" },
    { key: "past", fr: "Passées", ar: "السابقة" },
    { key: "revoked", fr: "Révoquées", ar: "الملغاة" },
  ] as const;

  return (
    <>
      <PageHeading title={locale === "ar" ? "تعييناتي" : "Mes désignations"} description={locale === "ar" ? "جميع المباريات التي تم تعيينك فيها بصفة رسمية." : "Tous les matchs sur lesquels vous êtes officiellement affecté."} />
      <div className="filter-tabs" role="tablist">
        {tabs.map((tab) => <Link key={tab.key} href={`/assignments?view=${tab.key}`} className={view === tab.key ? "active" : ""}>{locale === "ar" ? tab.ar : tab.fr}</Link>)}
      </div>
      <div className="assignment-list">
        {assignments.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} locale={locale} />)}
      </div>
      {assignments.length === 0 && <div className="empty-state"><FiCalendar /><h3>{locale === "ar" ? "لا توجد تعيينات" : "Aucune désignation"}</h3><p>{locale === "ar" ? "لا توجد مباريات في هذه الفئة." : "Aucun match ne correspond à cette catégorie."}</p></div>}
    </>
  );
}
