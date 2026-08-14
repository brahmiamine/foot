import Link from "next/link";
import { cookies } from "next/headers";
import { FiBell, FiCalendar, FiChevronRight, FiClock } from "react-icons/fi";
import { AssignmentCard } from "@/components/AssignmentCard";
import { PageHeading } from "@/components/PageHeading";
import { getLocale } from "@/lib/i18n";
import { getUnreadNotificationCount } from "@/lib/notificationClient";
import { requireRequestSession } from "@/lib/requestSession";
import { getSsoCookieName } from "../../../../packages/auth-shared/src/session";
import { AssignmentService } from "@/services/AssignmentService";

export default async function DashboardPage() {
  const [session, locale] = await Promise.all([requireRequestSession(), getLocale()]);
  const token = (await cookies()).get(getSsoCookieName())?.value ?? null;
  const [dashboard, unreadCount] = await Promise.all([
    new AssignmentService().dashboard(session.id),
    getUnreadNotificationCount(token),
  ]);

  return (
    <>
      <PageHeading
        eyebrow={locale === "ar" ? "لوحة التحكم" : "Tableau de bord"}
        title={locale === "ar" ? `مرحباً ${session.name}` : `Bonjour ${session.name}`}
        description={locale === "ar" ? "تابع تعييناتك الرسمية ونشاطك القادم." : "Retrouvez vos désignations officielles et votre prochaine activité."}
      />
      <section className="stats-grid" aria-label="Résumé">
        <Link href="/assignments?view=upcoming" className="stat-card">
          <span className="stat-icon red"><FiCalendar /></span>
          <div><strong>{dashboard.upcomingCount}</strong><span>{locale === "ar" ? "مباريات قادمة" : "Matchs à venir"}</span></div>
          <FiChevronRight className="stat-arrow" />
        </Link>
        <div className="stat-card">
          <span className="stat-icon amber"><FiClock /></span>
          <div><strong>{dashboard.recentChanges}</strong><span>{locale === "ar" ? "تغييرات خلال 7 أيام" : "Changements sur 7 jours"}</span></div>
        </div>
        <div className="stat-card">
          <span className="stat-icon blue"><FiBell /></span>
          <div><strong>{unreadCount}</strong><span>{locale === "ar" ? "إشعارات غير مقروءة" : "Notifications non lues"}</span></div>
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div><span>{locale === "ar" ? "التالي" : "À venir"}</span><h2>{locale === "ar" ? "التعيين القادم" : "Prochaine désignation"}</h2></div>
          <Link href="/assignments">{locale === "ar" ? "عرض الكل" : "Tout voir"}<FiChevronRight /></Link>
        </div>
        {dashboard.next ? (
          <AssignmentCard assignment={dashboard.next} locale={locale} />
        ) : (
          <div className="empty-state"><FiCalendar /><h3>{locale === "ar" ? "لا توجد تعيينات قادمة" : "Aucune désignation à venir"}</h3><p>{locale === "ar" ? "ستظهر تعييناتك هنا بعد اعتمادها من الجامعة أو الرابطة." : "Vos prochaines affectations apparaîtront ici après désignation par la fédération ou la ligue."}</p></div>
        )}
      </section>
    </>
  );
}
